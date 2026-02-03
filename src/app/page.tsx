import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import LoginButton from "@/components/LoginButton";
import Header from "@/components/Header";
import { Activity, Heart, Moon, Footprints, TrendingUp, Sparkles, BarChart2, MessageSquare, Video, BookOpen, Building2, Pill, Plane, Award } from "lucide-react";
import { NewsSection } from "@/components/home/NewsSection";
import { VideoSection } from "@/components/home/VideoSection";
import Link from "next/link";

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
            <div className="relative">
                <img
                    src="/favicon.png"
                    alt="Health Hub"
                    className="w-24 h-24 rounded-3xl shadow-xl"
                />
            </div>

            {/* Title */}
            <div className="space-y-3">
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 dark:from-teal-400 dark:to-emerald-400 bg-clip-text text-transparent">
                    Health Hub
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-lg leading-relaxed">
                    健康診断データやフィットネスデータを一元管理。<br />
                    あなたの健康を「見える化」して、より良い生活をサポートします。
                </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full pt-4">
                <FeatureCard
                    icon={<Footprints className="w-6 h-6" />}
                    title="活動記録"
                    description="歩数や運動を自動追跡"
                    color="teal"
                />
                <FeatureCard
                    icon={<Moon className="w-6 h-6" />}
                    title="睡眠分析"
                    description="睡眠の質を詳細に分析"
                    color="indigo"
                />
                <FeatureCard
                    icon={<TrendingUp className="w-6 h-6" />}
                    title="トレンド"
                    description="健康データの推移を可視化"
                    color="emerald"
                />
            </div>

            {/* CTA */}
            <div className="pt-6">
                <LoginButton />
            </div>

            {/* AI Badge */}
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>AI搭載の健康アドバイザー機能付き</span>
            </div>
        </div>
    );
}

// 機能カード
function FeatureCard({
    icon,
    title,
    description,
    color,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    color: 'teal' | 'indigo' | 'emerald';
}) {
    const colorClasses = {
        teal: 'bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400',
        indigo: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
        emerald: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 rounded-xl ${colorClasses[color]} flex items-center justify-center mb-3`}>
                {icon}
            </div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">{title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
        </div>
    );
}
