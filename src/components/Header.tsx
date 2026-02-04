'use client';

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { User as UserIcon, Activity, BarChart2, MessageSquare, FileText, Heart, Dna } from "lucide-react";

export default function Header() {
    const { data: session } = useSession();
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

    // PC版ナビゲーションリンク（指定順序）
    const navLinks = [
        { href: "/habits", label: "習慣", icon: Activity },
        { href: "/trends", label: "推移", icon: BarChart2 },
        { href: "/advisor", label: "レポート", icon: MessageSquare },
        { href: "/records", label: "診断記録", icon: FileText },
        { href: "/health-profile", label: "健康プロフ", icon: Heart },
        { href: "/dna", label: "DNA", icon: Dna },
    ];

    return (
        <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800">
            <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition group">
                    <Image
                        src="/favicon.png"
                        alt="Health Hub"
                        width={36}
                        height={36}
                        className="rounded-lg group-hover:scale-105 transition-transform"
                    />
                    <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                        Health Hub
                    </h1>
                </Link>

                {/* Desktop Navigation - PC版のみ表示 */}
                {session && (
                    <nav className="hidden md:flex items-center gap-1">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`px-3 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5
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

                {/* User Avatar (右上に表示) */}
                {session && (
                    <div className="flex items-center">
                        <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden border-2 border-white dark:border-slate-600 shadow-sm">
                            {session.user?.image ? (
                                <Image src={session.user.image} alt="User" width={36} height={36} className="w-full h-full object-cover" />
                            ) : (
                                <UserIcon className="w-4 h-4 text-slate-400" />
                            )}
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}
