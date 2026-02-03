'use client';

import { FileText, Search, Filter, BookOpen, Sparkles, TrendingUp, Construction } from 'lucide-react';

export default function ReportsClient() {
    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* ヘッダー */}
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                    <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                        プレミアムレポート
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        健康・アンチエイジング・医療の専門レポート
                    </p>
                </div>
            </div>

            {/* 開発予定バナー */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-2xl border border-amber-200 dark:border-amber-800 p-6 mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <Construction className="w-6 h-6 text-amber-500" />
                    <span className="text-lg font-semibold text-amber-700 dark:text-amber-300">
                        開発予定の機能
                    </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    この機能は現在開発中です。将来的に以下の機能を提供予定です。
                </p>
            </div>

            {/* 予定機能一覧 */}
            <div className="space-y-4">
                {/* レポート一覧 */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 opacity-60">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                            <BookOpen className="w-5 h-5 text-amber-500" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                                専門家監修レポート一覧
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                                医師・研究者が監修した、専門性の高い健康・アンチエイジング・医療に関するレポートを閲覧できます。
                                最新の研究成果や実践的なアドバイスを提供します。
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-xs">
                                    健康管理
                                </span>
                                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-xs">
                                    アンチエイジング
                                </span>
                                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-xs">
                                    予防医学
                                </span>
                                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-xs">
                                    栄養学
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 検索・フィルター機能 */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 opacity-60">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Search className="w-5 h-5 text-orange-500" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                                高度な検索・フィルター
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                                キーワード検索、カテゴリ別フィルター、公開日順・人気順のソートなど、
                                豊富な検索オプションで必要なレポートをすばやく見つけられます。
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                    <span className="w-2 h-2 bg-amber-400 rounded-full" />
                                    キーワード検索
                                </div>
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                    <span className="w-2 h-2 bg-orange-400 rounded-full" />
                                    カテゴリフィルター
                                </div>
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                    <span className="w-2 h-2 bg-yellow-400 rounded-full" />
                                    公開日ソート
                                </div>
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                    <span className="w-2 h-2 bg-red-400 rounded-full" />
                                    人気順ソート
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* パーソナライズ推奨 */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 opacity-60">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Sparkles className="w-5 h-5 text-yellow-500" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                                AIパーソナライズ推奨
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">
                                あなたの健康データ、検査結果、関心事項に基づいて、
                                AIが最適なレポートを推奨。効率的に必要な情報にアクセスできます。
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 注意書き */}
            <div className="mt-8 p-4 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                    ※ レポートの内容は情報提供を目的としており、医学的な診断や治療の代替ではありません。
                    <br />
                    具体的な健康上の問題については、必ず医療専門家にご相談ください。
                </p>
            </div>
        </div>
    );
}
