'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Upload, BarChart2, MessageSquare, Settings, LogOut, User as UserIcon, FileText, Dna, Smartphone } from "lucide-react";
import { useSession, signOut } from "next-auth/react";

export default function Header() {
    const { data: session } = useSession();
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

    const navLinks = [
        { href: "/trends", label: "推移", icon: BarChart2 },
        { href: "/habits", label: "習慣", icon: Activity },
        { href: "/records", label: "診断記録", icon: FileText },
        { href: "/smartphone", label: "スマホ", icon: Smartphone },
        { href: "/dna", label: "DNA", icon: Dna },
        { href: "/advisor", label: "レポート", icon: MessageSquare },
    ];

    return (
        <header className="hidden md:block sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition group">
                    <div className="w-9 h-9 bg-gradient-to-br from-teal-400 to-emerald-500 rounded-lg flex items-center justify-center shadow-md text-white group-hover:scale-105 transition-transform">
                        <Activity className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">Health Hub</h1>
                    </div>
                </Link>

                {/* Desktop Navigation */}
                {session && (
                    <nav className="flex items-center gap-1">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2
                                    ${isActive(link.href)
                                        ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                                    }`}
                            >
                                <link.icon className="w-4 h-4" />
                                {link.label}
                            </Link>
                        ))}
                    </nav>
                )}

                {/* Right Side Actions */}
                <div className="flex items-center gap-4">
                    {session && (
                        <div className="flex items-center gap-4">
                            {/* Profile Dropdown Trigger */}
                            <div className="relative group">
                                <Link href="/profile" className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full border border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600 transition bg-white dark:bg-slate-800">
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 px-2 max-w-[100px] truncate">
                                        {session.user?.name || 'User'}
                                    </span>
                                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                                        {session.user?.image ? (
                                            <img src={session.user.image} alt="User" className="w-full h-full object-cover" />
                                        ) : (
                                            <UserIcon className="w-4 h-4 text-slate-400" />
                                        )}
                                    </div>
                                </Link>

                                {/* Hover Dropdown */}
                                <div className="absolute top-full right-0 pt-2 w-48 hidden group-hover:block animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 p-1">
                                        <Link href="/profile" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white">
                                            <UserIcon className="w-4 h-4" /> マイページ
                                        </Link>
                                        <Link href="/profile/settings/items" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white">
                                            <Settings className="w-4 h-4" /> 検査項目・基準値設定
                                        </Link>
                                        <Link href="/profile/settings/items/merge" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white">
                                            <Upload className="w-4 h-4" /> 検査項目の統合
                                        </Link>
                                        <div className="my-1 border-t border-gray-100 dark:border-slate-700"></div>
                                        <button
                                            onClick={() => signOut()}
                                            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        >
                                            <LogOut className="w-4 h-4" /> ログアウト
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
