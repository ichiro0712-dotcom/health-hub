'use client';

import Link from 'next/link';
import { Database, Settings, ArrowRight } from 'lucide-react';

const healthDataSubPages = [
  {
    label: 'マスタ項目管理',
    description: '検査項目のマスタデータ（標準名・JLAC10・同義語）を管理します',
    href: '/admin/health-data/master-items',
    icon: <Database className="w-6 h-6" />,
    color: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
  },
  {
    label: '表示設定',
    description: 'ヘルス項目の表示名・基準範囲・タグ・有効/無効を管理します',
    href: '/admin/health-data/display-settings',
    icon: <Settings className="w-6 h-6" />,
    color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  },
];

export default function AdminHealthDataPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">ヘルスデータ管理</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          ヘルスデータのマスタ項目と表示設定を管理します
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {healthDataSubPages.map(page => (
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
