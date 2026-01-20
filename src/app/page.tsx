import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import LoginButton from "@/components/LoginButton";
import DashboardCharts from "@/components/DashboardCharts";
import RecentRecords from "@/components/RecentRecords";
import Header from "@/components/Header";
import { getDashboardData } from "./actions/dashboard";
import { Activity, Clock } from "lucide-react";

export default async function Home() {
    const session = await getServerSession(authOptions);
    let dashboardData;

    if (session) {
        const dashRes = await getDashboardData();
        dashboardData = dashRes.success ? dashRes.data : null;
    }

    return (
        <main className="min-h-screen pb-24 md:pb-8">
            <Header />

            <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6">
                {session ? (
                    <div className="space-y-6">
                        {/* Greeting / Intro */}
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                                こんにちは、{session.user?.name}さん
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">今日の健康状態をチェックしましょう</p>
                        </div>

                        {/* Dashboard Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Section 1: Review Trends (Main - Takes up 2 cols on lg) */}
                            <section className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col">
                                <div className="p-5 border-b border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/50 flex items-center justify-between">
                                    <h2 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                        <Activity className="w-5 h-5 text-teal-500" />
                                        健康トレンド
                                    </h2>
                                </div>
                                <div className="p-5 flex-1 min-h-[300px]">
                                    <DashboardCharts />
                                </div>
                            </section>

                            {/* Section 2: Recent Records (Side - Takes up 1 col on lg) */}
                            <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                                <div className="p-5 border-b border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/50 flex items-center justify-between">
                                    <h2 className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-teal-500" />
                                        最新の記録
                                    </h2>
                                </div>
                                <div className="p-0">
                                    <RecentRecords records={dashboardData?.records || []} />
                                </div>
                            </section>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
                        <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mb-4">
                            <Activity className="w-10 h-10 text-teal-600" />
                        </div>
                        <h2 className="text-3xl font-bold text-slate-800">Health Hubへようこそ</h2>
                        <p className="text-slate-500 max-w-md leading-relaxed">
                            健康診断データやフィットネスデータを一元管理。<br />
                            あなたの健康を「見える化」して、より良い生活をサポートします。
                        </p>
                        <div className="pt-4">
                            <LoginButton />
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
