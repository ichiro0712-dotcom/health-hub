'use client';

import { Dna, Upload, BarChart3, AlertCircle, Construction } from 'lucide-react';

export default function DNAClient() {
    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* ヘッダー */}
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Dna className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                        DNAデータ
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        遺伝子検査データの登録と分析
                    </p>
                </div>
            </div>

            {/* 開発予定バナー */}
            <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-2xl border border-violet-200 dark:border-violet-800 p-6 mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <Construction className="w-6 h-6 text-violet-500" />
                    <span className="text-lg font-semibold text-violet-700 dark:text-violet-300">
                        開発予定の機能
                    </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    この機能は現在開発中です。将来的に以下の機能を提供予定です。
                </p>
            </div>

            {/* 予定機能一覧 */}
            <div className="space-y-4">
                {/* CSV登録機能 */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 opacity-60">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Upload className="w-5 h-5 text-violet-500" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                                DNAデータのCSV登録
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                                23andMe、AncestryDNA、MyHeritageなどの遺伝子検査サービスから
                                エクスポートしたCSV/TXTファイルをアップロードできます。
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-xs">
                                    23andMe
                                </span>
                                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-xs">
                                    AncestryDNA
                                </span>
                                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-xs">
                                    MyHeritage
                                </span>
                                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-xs">
                                    GeneSLife
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 分析機能 */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 opacity-60">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                            <BarChart3 className="w-5 h-5 text-purple-500" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                                遺伝的傾向の分析
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                                登録したDNAデータを基に、健康リスクや体質傾向を分析。
                                AIが健康プロフィールや検査結果と組み合わせて総合的なアドバイスを提供します。
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                    <span className="w-2 h-2 bg-violet-400 rounded-full" />
                                    疾患リスク傾向
                                </div>
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                    <span className="w-2 h-2 bg-purple-400 rounded-full" />
                                    代謝・体質タイプ
                                </div>
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                    <span className="w-2 h-2 bg-pink-400 rounded-full" />
                                    栄養素代謝能力
                                </div>
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                    <span className="w-2 h-2 bg-indigo-400 rounded-full" />
                                    運動適性
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* リスク通知機能 */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 opacity-60">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-pink-100 dark:bg-pink-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="w-5 h-5 text-pink-500" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                                パーソナライズされた健康提案
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">
                                遺伝的傾向に基づいた食事・運動・生活習慣のアドバイス。
                                検査結果との組み合わせで、より精度の高い健康管理をサポートします。
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 注意書き */}
            <div className="mt-8 p-4 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                    ※ DNAデータの分析結果は参考情報であり、医学的な診断ではありません。
                    <br />
                    遺伝的リスクは必ずしも発症を意味するものではなく、生活習慣や環境によって変化します。
                </p>
            </div>
        </div>
    );
}
