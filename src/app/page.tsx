import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import LoginButton from "@/components/LoginButton";
import Header from "@/components/Header";
import { Activity, BarChart2, Video, BookOpen, Building2, Pill, Plane, Award } from "lucide-react";
import { NewsSection } from "@/components/home/NewsSection";
import { VideoSection } from "@/components/home/VideoSection";
import Link from "next/link";
import Image from "next/image";

export default async function Home() {
    const session = await getServerSession(authOptions);

    return (
        <main className="min-h-screen pb-24 bg-slate-50 dark:bg-slate-900">
            <Header />

            <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6">
                {session ? (
                    <div className="space-y-6">
                        {/* Quick Menu Buttons - Icon Main Design */}
                        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                            <Link
                                href="/habits"
                                className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all shadow-sm"
                            >
                                <Activity className="w-6 h-6 text-teal-500 mb-1.5" />
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">習慣</span>
                            </Link>
                            <Link
                                href="/trends"
                                className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all shadow-sm"
                            >
                                <BarChart2 className="w-6 h-6 text-teal-500 mb-1.5" />
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">推移</span>
                            </Link>
                            <Link
                                href="/advisor"
                                className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all shadow-sm"
                            >
                                <Award className="w-6 h-6 text-teal-500 mb-1.5" />
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">スコア</span>
                            </Link>
                            <Link
                                href="/videos"
                                className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all shadow-sm"
                            >
                                <Video className="w-6 h-6 text-teal-500 mb-1.5" />
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">動画</span>
                            </Link>
                            <Link
                                href="/reports"
                                className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all shadow-sm"
                            >
                                <BookOpen className="w-6 h-6 text-teal-500 mb-1.5" />
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">レポート</span>
                            </Link>
                            <Link
                                href="/clinics"
                                className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all shadow-sm"
                            >
                                <Building2 className="w-6 h-6 text-teal-500 mb-1.5" />
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">クリニック</span>
                            </Link>
                            <Link
                                href="/prescription"
                                className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all shadow-sm"
                            >
                                <Pill className="w-6 h-6 text-teal-500 mb-1.5" />
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">処方</span>
                            </Link>
                            <Link
                                href="/medical-tour"
                                className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-all shadow-sm"
                            >
                                <Plane className="w-6 h-6 text-teal-500 mb-1.5" />
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">ツアー</span>
                            </Link>
                        </div>

                        {/* Main Content Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* News Section - 1 column on large screens */}
                            <div className="lg:col-span-1">
                                <NewsSection />
                            </div>

                            {/* Video Section - 2 columns on large screens */}
                            <div className="lg:col-span-2">
                                <VideoSection />
                            </div>
                        </div>
                    </div>
                ) : (
                    <UnauthenticatedHome />
                )}
            </div>
        </main>
    );
}

// 未認証ユーザー向けホーム
function UnauthenticatedHome() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center space-y-8 py-12">
            {/* Logo */}
            <div className="relative w-24 h-24">
                <Image
                    src="/favicon.png"
                    alt="Health Hub"
                    width={96}
                    height={96}
                    className="rounded-3xl shadow-xl"
                    priority
                />
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 dark:from-teal-400 dark:to-emerald-400 bg-clip-text text-transparent">
                Health Hub
            </h1>

            {/* Buttons */}
            <div className="flex flex-col gap-3 w-full max-w-xs">
                <LoginButton />
            </div>
        </div>
    );
}
