import Link from 'next/link';
import Header from '@/components/Header';
import { FileText, Watch, Database, ChevronRight } from 'lucide-react';

export default function SettingsPage() {
    const menuItems = [
        {
            href: '/settings/google-docs',
            icon: FileText,
            iconColor: 'text-blue-500',
            title: 'Google Docs連携',
            description: 'データの自動同期設定',
        },
        {
            href: '/settings/fitbit',
            icon: Watch,
            iconColor: 'text-emerald-500',
            title: 'Fitbit連携',
            description: '睡眠・心拍数データの同期',
        },
        {
            href: '/settings/data-sync',
            icon: Database,
            iconColor: 'text-purple-500',
            title: 'データ同期',
            description: 'バックアップと復元',
        },
    ];

    return (
        <div className="min-h-screen pb-24 md:pb-8 bg-slate-50 dark:bg-slate-900">
            <Header />

            {/* ヘッダー */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <div className="max-w-2xl mx-auto px-4 md:px-6 py-4">
                    <h1 className="text-xl font-bold text-slate-800 dark:text-white">
                        設定
                    </h1>
                </div>
            </div>

            {/* メニュー */}
            <div className="max-w-2xl mx-auto px-4 md:px-6 py-6">
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    {menuItems.map((item, index) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                                index < menuItems.length - 1 ? 'border-b border-slate-100 dark:border-slate-700' : ''
                            }`}
                        >
                            <div className={`p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 ${item.iconColor}`}>
                                <item.icon className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-medium text-slate-800 dark:text-white">
                                    {item.title}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {item.description}
                                </p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-slate-400" />
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
