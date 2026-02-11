'use client';

import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  BarChart3,
  Database,
  Users,
  Bug,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Shield,
  LogOut,
} from 'lucide-react';

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  children?: { label: string; href: string }[];
}

const navItems: NavItem[] = [
  {
    label: 'ダッシュボード',
    href: '/admin',
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    label: 'AIチャット',
    href: '/admin/chat',
    icon: <MessageSquare className="w-5 h-5" />,
    children: [
      { label: '仕様', href: '/admin/chat/spec' },
      { label: 'プロンプト', href: '/admin/chat/prompts' },
      { label: 'モード検出', href: '/admin/chat/mode-detection' },
      { label: '挨拶文', href: '/admin/chat/greetings' },
      { label: '質問マスタ', href: '/admin/chat/questions' },
      { label: 'しきい値', href: '/admin/chat/thresholds' },
    ],
  },
  {
    label: 'スコア',
    href: '/admin/score',
    icon: <BarChart3 className="w-5 h-5" />,
    children: [
      { label: '分析プロンプト', href: '/admin/score/analysis' },
      { label: 'カテゴリ', href: '/admin/score/categories' },
    ],
  },
  {
    label: 'ヘルスデータ',
    href: '/admin/health-data',
    icon: <Database className="w-5 h-5" />,
    children: [
      { label: 'マスタ項目', href: '/admin/health-data/master-items' },
      { label: '表示設定', href: '/admin/health-data/display-settings' },
    ],
  },
  {
    label: 'ユーザー',
    href: '/admin/users',
    icon: <Users className="w-5 h-5" />,
    children: [
      { label: 'ユーザー一覧', href: '/admin/users' },
      { label: '統計', href: '/admin/users/stats' },
    ],
  },
  {
    label: 'バグ検知',
    href: '/admin/bugs',
    icon: <Bug className="w-5 h-5" />,
  },
];

function SidebarNavItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = pathname === item.href;
  const isParentActive = item.children?.some(c => pathname === c.href) || isActive;
  const [expanded, setExpanded] = useState(isParentActive);

  return (
    <li>
      <div className="flex items-center">
        <Link
          href={item.href}
          className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isActive
              ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <span className={isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'}>
            {item.icon}
          </span>
          <span>{item.label}</span>
        </Link>
        {item.children && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors"
            aria-label={expanded ? `${item.label}を閉じる` : `${item.label}を開く`}
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        )}
      </div>
      {item.children && expanded && (
        <ul className="ml-8 mt-1 space-y-0.5">
          {item.children.map(child => {
            const childActive = pathname === child.href;
            return (
              <li key={child.href}>
                <Link
                  href={child.href}
                  className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                    childActive
                      ? 'text-teal-700 bg-teal-50 font-medium dark:text-teal-300 dark:bg-teal-900/30'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {child.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-2">アクセス権限がありません</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            この画面は管理者のみがアクセスできます。管理者アカウントでログインしてください。
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors font-medium text-sm"
          >
            <LogOut className="w-4 h-4" />
            トップページへ戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      {/* Mobile header */}
      <div className="lg:hidden sticky top-0 z-40 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
          aria-label="メニューを開く"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Health Hub Admin</span>
        <div className="w-9" />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-white dark:bg-slate-800 shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <span className="text-sm font-semibold text-teal-700 dark:text-teal-400">Admin Panel</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                aria-label="メニューを閉じる"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{session.user.name}</p>
              <p className="text-xs text-slate-400 truncate">{session.user.email}</p>
            </div>
            <nav className="flex-1 overflow-y-auto p-3">
              <ul className="space-y-1">
                {navItems.map(item => (
                  <SidebarNavItem key={item.href} item={item} pathname={pathname} />
                ))}
              </ul>
            </nav>
            <div className="p-3 border-t border-slate-200 dark:border-slate-700">
              <Link
                href="/"
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-slate-800"
              >
                <LogOut className="w-4 h-4" />
                サイトに戻る
              </Link>
            </div>
          </aside>
        </div>
      )}

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700">
          <div className="px-4 py-5 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-800 dark:text-white">Health Hub</h2>
                <p className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">ADMIN PANEL</p>
              </div>
            </div>
          </div>

          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{session.user.name}</p>
            <p className="text-xs text-slate-400 truncate">{session.user.email}</p>
          </div>

          <nav className="flex-1 overflow-y-auto p-3">
            <ul className="space-y-1">
              {navItems.map(item => (
                <SidebarNavItem key={item.href} item={item} pathname={pathname} />
              ))}
            </ul>
          </nav>

          <div className="p-3 border-t border-slate-200 dark:border-slate-700">
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors dark:text-slate-400 dark:hover:text-slate-300 dark:hover:bg-slate-800"
            >
              <LogOut className="w-4 h-4" />
              サイトに戻る
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 lg:ml-64 min-h-screen">
          <div className="p-4 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
