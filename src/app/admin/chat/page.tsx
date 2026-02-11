'use client';

import Link from 'next/link';
import {
  FileText,
  Brain,
  MessageCircle,
  HelpCircle,
  Sliders,
  ArrowRight,
  BookOpen,
} from 'lucide-react';

const chatSubPages = [
  {
    label: 'AIチャット仕様',
    description: 'チャットのアーキテクチャ設計・仕様ドキュメントの確認',
    href: '/admin/chat/spec',
    icon: <BookOpen className="w-6 h-6" />,
    color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
  },
  {
    label: 'プロンプト管理',
    description: 'AIチャットで使用されるプロンプトテンプレートの編集',
    href: '/admin/chat/prompts',
    icon: <FileText className="w-6 h-6" />,
    color: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
  },
  {
    label: 'モード検出ルール',
    description: 'チャットモードの自動判定ルール設定',
    href: '/admin/chat/mode-detection',
    icon: <Brain className="w-6 h-6" />,
    color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  },
  {
    label: '挨拶文設定',
    description: '初回挨拶やセッション終了メッセージの管理',
    href: '/admin/chat/greetings',
    icon: <MessageCircle className="w-6 h-6" />,
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  },
  {
    label: '質問マスタ',
    description: 'ヘルスヒアリング質問の管理と優先度設定',
    href: '/admin/chat/questions',
    icon: <HelpCircle className="w-6 h-6" />,
    color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  },
  {
    label: 'しきい値設定',
    description: '信頼度スコアの閾値調整',
    href: '/admin/chat/thresholds',
    icon: <Sliders className="w-6 h-6" />,
    color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
  },
];

export default function AdminChatPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">AIチャット管理</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          AIチャットの動作に関する各種設定を管理します
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {chatSubPages.map(page => (
          <Link
            key={page.href}
            href={page.href}
            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 hover:border-teal-300 dark:hover:border-teal-600 hover:shadow-md transition-all group"
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${page.color}`}>
              {page.icon}
            </div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
              {page.label}
              <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-teal-500" />
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{page.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
