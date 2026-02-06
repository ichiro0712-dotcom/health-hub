'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  Menu,
  X,
  Home,
  Activity,
  BarChart2,
  MessageSquare,
  FileText,
  Heart,
  Dna,
  User,
  Settings,
  Layers,
  Smartphone,
  FileSpreadsheet,
  LogOut,
  ChevronRight,
  Video,
  BookOpen,
  Building2,
  Pill,
  Plane,
  HelpCircle,
  MessageCircle,
} from 'lucide-react';
import Image from 'next/image';
import { useChatModal } from '@/contexts/ChatModalContext';

export default function FloatingMenu() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { openChat } = useChatModal();
  const scrollRef = useRef<HTMLDivElement>(null);

  // メニューが開いているときは背景スクロールを防止 & スクロール位置リセット
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      scrollRef.current?.scrollTo(0, 0);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

  // メニュー構造（メインメニュー）
  const mainMenuItems = [
    { href: '/', icon: Home, label: 'ホーム', exact: true },
    { href: '/habits', icon: Activity, label: '習慣' },
    { href: '/trends', icon: BarChart2, label: '推移' },
    { href: '/advisor', icon: MessageSquare, label: 'スコア' },
  ];

  // ヘルスデータセクション
  const healthDataItems = [
    { href: '/records', icon: FileText, label: '診断記録' },
    { href: '/health-profile', icon: Heart, label: '健康プロフ' },
    { href: '/dna', icon: Dna, label: 'DNA' },
  ];

  // コンテンツセクション
  const contentItems = [
    { href: '/videos', icon: Video, label: '動画' },
    { href: '/reports', icon: BookOpen, label: 'レポート' },
    { href: '/clinics', icon: Building2, label: '提携クリニック' },
    { href: '/prescription', icon: Pill, label: 'オンライン処方' },
    { href: '/medical-tour', icon: Plane, label: '医療ツアー' },
  ];

  const settingsItems = [
    { href: '/profile', icon: User, label: 'マイページ' },
    { href: '/help', icon: HelpCircle, label: 'ヘルプ・FAQ' },
    { href: '/profile/settings/items', icon: Settings, label: '検査項目・基準値設定' },
    { href: '/profile/settings/items/merge', icon: Layers, label: '検査項目の統合' },
    { href: '/settings/data-sync', icon: Smartphone, label: 'スマホデータ連携' },
    { href: '/settings/google-docs', icon: FileSpreadsheet, label: 'Google Docs連携' },
  ];

  if (!session) return null;

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-in Menu Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[300px] max-w-[85vw] bg-white dark:bg-slate-900 z-[70] shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Menu Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <Link href="/" onClick={() => setIsOpen(false)} className="flex items-center gap-3">
              <Image
                src="/favicon.png"
                alt="Health Hub"
                width={36}
                height={36}
                className="rounded-lg"
              />
              <span className="font-bold text-slate-800 dark:text-white">Health Hub</span>
            </Link>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          {/* User Info */}
          <div className="mt-4 flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
              {session.user?.image ? (
                <Image src={session.user.image} alt="User" width={40} height={40} className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-slate-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-800 dark:text-white truncate">
                {session.user?.name || 'ユーザー'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {session.user?.email}
              </p>
            </div>
          </div>
        </div>

        {/* Menu Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 pb-24">
          {/* AIチャットボタン */}
          <button
            onClick={() => {
              setIsOpen(false);
              openChat();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-all mb-2"
          >
            <MessageCircle className="w-5 h-5" />
            <div className="text-left">
              <span className="font-bold block">H-Hubアシスタント</span>
              <span className="text-xs opacity-70">健康相談・プロフィール作成</span>
            </div>
          </button>

          {/* Main Menu */}
          <nav className="space-y-1">
            {mainMenuItems.map((item) => {
              const Icon = item.icon;
              const active = item.exact ? pathname === item.href : isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    active
                      ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                  {active && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              );
            })}
          </nav>

          {/* Divider - ヘルスデータ */}
          <div className="my-4 border-t border-slate-100 dark:border-slate-800" />
          <div className="mb-2 px-4">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              ヘルスデータ
            </p>
          </div>
          <nav className="space-y-1">
            {healthDataItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    active
                      ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                  {active && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              );
            })}
          </nav>

          {/* Divider - コンテンツ */}
          <div className="my-4 border-t border-slate-100 dark:border-slate-800" />
          <div className="mb-2 px-4">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              コンテンツ
            </p>
          </div>
          <nav className="space-y-1">
            {contentItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    active
                      ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                  {active && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              );
            })}
          </nav>

          {/* Divider - マイページ */}
          <div className="my-4 border-t border-slate-100 dark:border-slate-800" />

          {/* Settings Section */}
          <div className="mb-2 px-4">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              マイページ
            </p>
          </div>
          <nav className="space-y-1">
            {settingsItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    active
                      ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
            {/* マイページ内ログアウト */}
            <button
              onClick={() => {
                setIsOpen(false);
                signOut({ callbackUrl: '/' });
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">ログアウト</span>
            </button>
          </nav>

        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-[55] w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
          isOpen
            ? 'bg-slate-800 dark:bg-slate-200 rotate-90'
            : 'bg-teal-500 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 hover:scale-105'
        }`}
        style={{
          boxShadow: isOpen
            ? '0 4px 20px rgba(0, 0, 0, 0.3)'
            : '0 4px 20px rgba(20, 184, 166, 0.4)',
        }}
      >
        <Menu
          className={`w-6 h-6 transition-all duration-300 ${
            isOpen ? 'text-white dark:text-slate-800' : 'text-white'
          }`}
        />
      </button>
    </>
  );
}
