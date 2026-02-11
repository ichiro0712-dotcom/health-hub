'use client';

import Link from 'next/link';
import { FileText, ListChecks, ArrowRight } from 'lucide-react';

const scoreSubPages = [
  {
    label: '分析プロンプト管理',
    description: 'ヘルススコア分析で使用されるプロンプトを編集します',
    href: '/admin/score/analysis',
    icon: <FileText className="w-6 h-6" />,
    color: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
  },
  {
    label: 'カテゴリ管理',
    description: 'ヘルスカテゴリのランクや説明を設定します',
    href: '/admin/score/categories',
    icon: <ListChecks className="w-6 h-6" />,
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  },
];

export default function AdminScorePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">スコア管理</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          ヘルススコアの分析ロジックとカテゴリを管理します
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scoreSubPages.map(page => (
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
