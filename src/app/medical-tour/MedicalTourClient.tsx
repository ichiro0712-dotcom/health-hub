'use client';

import { Plane, Globe, Heart, Shield, Calendar, Users, MapPin, Construction } from 'lucide-react';

export default function MedicalTourClient() {
    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* ヘッダー */}
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Plane className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                        医療ツアー
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        海外で受けられる先進医療ツアー
                    </p>
                </div>
            </div>

            {/* 開発予定バナー */}
            <div className="bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 rounded-2xl border border-rose-200 dark:border-rose-800 p-6 mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <Construction className="w-6 h-6 text-rose-500" />
                    <span className="text-lg font-semibold text-rose-700 dark:text-rose-300">
                        開発予定の機能
                    </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    この機能は現在開発中です。将来的に以下の機能を提供予定です。
                </p>
            </div>

            {/* 予定機能一覧 */}
            <div className="space-y-4">
                {/* ツアー検索 */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 opacity-60">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Globe className="w-5 h-5 text-rose-500" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                                先進医療ツアー検索
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                                国内では受けられない、または高額な先進医療を海外で受けられる
                                医療ツアーを検索・比較できます。
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-xs">
                                    幹細胞治療
                                </span>
                                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-xs">
                                    再生医療
                                </span>
                                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-xs">
                                    がん免疫療法
                                </span>
                                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-xs">
                                    アンチエイジング
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 渡航先一覧 */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 opacity-60">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-pink-100 dark:bg-pink-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-5 h-5 text-pink-500" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                                渡航先・提携病院
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                                信頼できる提携医療機関がある渡航先を紹介。
                                各国の医療水準、得意分野、費用感を比較できます。
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                    <span className="w-2 h-2 bg-rose-400 rounded-full" />
                                    タイ（バンコク）
                                </div>
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                    <span className="w-2 h-2 bg-pink-400 rounded-full" />
                                    韓国（ソウル）
                                </div>
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                    <span className="w-2 h-2 bg-red-400 rounded-full" />
                                    シンガポール
                                </div>
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                    <span className="w-2 h-2 bg-orange-400 rounded-full" />
                                    ドイツ
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* サポート体制 */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 opacity-60">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-fuchsia-100 dark:bg-fuchsia-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Users className="w-5 h-5 text-fuchsia-500" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                                安心のサポート体制
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                                日本語対応のコーディネーター、通訳、現地サポートを完備。
                                渡航前の相談から帰国後のフォローアップまでトータルサポート。
                            </p>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                    <Shield className="w-4 h-4 text-emerald-500" />
                                    渡航前オンライン相談
                                </div>
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                    <Shield className="w-4 h-4 text-emerald-500" />
                                    日本語通訳・コーディネーター同行
                                </div>
                                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                    <Shield className="w-4 h-4 text-emerald-500" />
                                    帰国後フォローアップ
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 予約・申込 */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 opacity-60">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Calendar className="w-5 h-5 text-violet-500" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                                オンライン予約・申込
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">
                                ツアーの空き状況確認、見積もり依頼、申込までオンラインで完結。
                                費用の内訳や必要書類も事前に確認できます。
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 注意書き */}
            <div className="mt-8 p-4 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                    ※ 医療ツアーは海外での医療行為を含むため、リスクや制限事項があります。
                    <br />
                    渡航前に必ず医師と相談し、十分な情報収集を行ってください。
                    <br />
                    当サービスは情報提供とコーディネートを行うものであり、医療行為は提携医療機関が行います。
                </p>
            </div>
        </div>
    );
}
