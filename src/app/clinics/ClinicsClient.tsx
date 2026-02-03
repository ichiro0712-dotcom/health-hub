'use client';

import { Building2, MapPin, Search, Star, Calendar, Shield, Construction } from 'lucide-react';

export default function ClinicsClient() {
    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* ヘッダー */}
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                        提携クリニック
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        信頼できる提携医療機関の検索
                    </p>
                </div>
            </div>

            {/* 開発予定バナー */}
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl border border-blue-200 dark:border-blue-800 p-6 mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <Construction className="w-6 h-6 text-blue-500" />
                    <span className="text-lg font-semibold text-blue-700 dark:text-blue-300">
                        開発予定の機能
                    </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    この機能は現在開発中です。将来的に以下の機能を提供予定です。
                </p>
            </div>

            {/* 予定機能一覧 */}
            <div className="space-y-4">
                {/* クリニック検索 */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 opacity-60">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Search className="w-5 h-5 text-blue-500" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                                クリニック検索
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                                診療科目、専門分野、対応可能な検査・治療などの条件で、
                                最適なクリニックを検索できます。
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-xs">
                                    人間ドック
                                </span>
                                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-xs">
                                    アンチエイジング
                                </span>
                                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-xs">
                                    予防医学
                                </span>
                                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-xs">
                                    専門外来
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* エリア検索 */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 opacity-60">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-5 h-5 text-cyan-500" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                                エリア・マップ検索
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                                現在地からの距離、都道府県、最寄り駅などで検索。
                                マップ上でクリニックの位置を確認できます。
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                    <span className="w-2 h-2 bg-blue-400 rounded-full" />
                                    現在地から検索
                                </div>
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                    <span className="w-2 h-2 bg-cyan-400 rounded-full" />
                                    駅名から検索
                                </div>
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                    <span className="w-2 h-2 bg-teal-400 rounded-full" />
                                    都道府県選択
                                </div>
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                    <span className="w-2 h-2 bg-emerald-400 rounded-full" />
                                    マップ表示
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* クリニック詳細・口コミ */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 opacity-60">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Star className="w-5 h-5 text-indigo-500" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                                詳細情報・レビュー
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">
                                各クリニックの詳細情報、設備、医師紹介、ユーザーレビューを確認。
                                実際に受診した方の体験談を参考にできます。
                            </p>
                        </div>
                    </div>
                </div>

                {/* 予約連携 */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 opacity-60">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Calendar className="w-5 h-5 text-violet-500" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                                オンライン予約連携
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">
                                対応クリニックへのオンライン予約が可能。
                                空き状況の確認から予約完了まで、アプリ内で完結できます。
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 注意書き */}
            <div className="mt-8 p-4 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                    ※ 提携クリニックは当サービスの審査基準を満たした医療機関です。
                    <br />
                    診療内容や費用については、各クリニックに直接お問い合わせください。
                </p>
            </div>
        </div>
    );
}
