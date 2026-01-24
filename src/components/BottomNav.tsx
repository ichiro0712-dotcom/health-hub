'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BarChart2, FileText, Menu, Activity, MessageSquare, Dna, Smartphone } from 'lucide-react';
import { useState } from 'react';

export default function BottomNav() {
    const pathname = usePathname();
    const [showMore, setShowMore] = useState(false);

    const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

    // メインメニュー（4つ + その他）
    const mainItems = [
        { href: '/trends', icon: BarChart2, label: '推移' },
        { href: '/habits', icon: Activity, label: '習慣' },
        { href: '/advisor', icon: MessageSquare, label: 'レポート' },
        { href: '/records', icon: FileText, label: '診断記録' },
    ];

    // その他メニュー
    const moreItems = [
        { href: '/', icon: Home, label: 'ホーム', exact: true },
        { href: '/smartphone', icon: Smartphone, label: 'スマホ連携' },
        { href: '/dna', icon: Dna, label: 'DNA' },
        { href: '/profile', icon: Menu, label: '設定' },
    ];

    return (
        <>
            {/* More menu overlay */}
            {showMore && (
                <div
                    className="md:hidden fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
                    onClick={() => setShowMore(false)}
                />
            )}

            {/* More menu panel */}
            {showMore && (
                <div className="md:hidden fixed bottom-[calc(env(safe-area-inset-bottom)+60px)] left-4 right-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
                    <div className="p-2">
                        <div className="grid grid-cols-4 gap-1">
                            {moreItems.map((item) => {
                                const Icon = item.icon;
                                const active = item.href === '/profile'
                                    ? isActive('/profile') || isActive('/settings')
                                    : isActive(item.href);
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setShowMore(false)}
                                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all ${
                                            active
                                                ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400'
                                                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        <Icon className="w-6 h-6" />
                                        <span className="text-[10px] font-medium leading-tight text-center">{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom navigation bar */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-gray-200 dark:border-slate-800 z-50 safe-area-bottom">
                <div className="flex justify-around items-center h-[60px] px-2">
                    {mainItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex flex-col items-center justify-center gap-0.5 py-1.5 px-3 rounded-xl transition-all min-w-[60px] ${
                                    active
                                        ? 'text-teal-600 dark:text-teal-400'
                                        : 'text-slate-400 dark:text-slate-500 active:text-slate-600 dark:active:text-slate-300'
                                }`}
                            >
                                <Icon className={`w-6 h-6 ${active ? 'stroke-[2.5px]' : ''}`} />
                                <span className={`text-[10px] leading-tight ${active ? 'font-bold' : 'font-medium'}`}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}

                    {/* More button */}
                    <button
                        onClick={() => setShowMore(!showMore)}
                        className={`flex flex-col items-center justify-center gap-0.5 py-1.5 px-3 rounded-xl transition-all min-w-[60px] ${
                            showMore || pathname === '/' || isActive('/smartphone') || isActive('/dna') || isActive('/profile') || isActive('/settings')
                                ? 'text-teal-600 dark:text-teal-400'
                                : 'text-slate-400 dark:text-slate-500 active:text-slate-600 dark:active:text-slate-300'
                        }`}
                    >
                        <Menu className={`w-6 h-6 transition-transform ${showMore ? 'rotate-90' : ''}`} />
                        <span className={`text-[10px] leading-tight ${showMore ? 'font-bold' : 'font-medium'}`}>
                            その他
                        </span>
                    </button>
                </div>
            </div>
        </>
    );
}
