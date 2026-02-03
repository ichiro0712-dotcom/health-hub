'use client';

import { Pill, Sparkles, Stethoscope, ShoppingCart, Leaf, Syringe, Construction } from 'lucide-react';

export default function PrescriptionClient() {
    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* ヘッダー */}
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Pill className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                        オンライン処方
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        サプリメント・医薬品のオンライン注文
                    </p>
                </div>
            </div>

            {/* 開発予定バナー */}
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl border border-emerald-200 dark:border-emerald-800 p-6 mb-8">
                <div className="flex items-center gap-3 mb-4">
                    <Construction className="w-6 h-6 text-emerald-500" />
                    <span className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">
                        開発予定の機能
                    </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    この機能は現在開発中です。将来的に以下の機能を提供予定です。
                </p>
            </div>

            {/* サプリメントセクション */}
            <div className="mb-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <Leaf className="w-5 h-5 text-emerald-500" />
                    サプリメント
                </h2>
                <div className="space-y-4">
                    {/* AI推奨サプリメント */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 opacity-60">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Sparkles className="w-5 h-5 text-emerald-500" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                                    AIパーソナライズ推奨
                                </h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                                    あなたの健康データ、検査結果、生活習慣に基づいて、
                                    AIが最適なサプリメントを推奨します。
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-xs">
                                        ビタミン・ミネラル
                                    </span>
                                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-xs">
                                        プロバイオティクス
                                    </span>
                                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-xs">
                                        オメガ3
                                    </span>
                                    <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-xs">
                                        NMN・NAD+
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* カスタマイズ注文 */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 opacity-60">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                <ShoppingCart className="w-5 h-5 text-teal-500" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                                    カスタムサプリメントセット
                                </h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm">
                                    推奨されたサプリメントをベースに、自分好みにカスタマイズ。
                                    オリジナルのサプリメントセットを設計し、定期配送でオンライン注文できます。
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* オンライン処方セクション */}
            <div className="mb-6">
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-blue-500" />
                    オンライン処方（医師の診断が必要）
                </h2>
                <div className="space-y-4">
                    {/* オンライン診療 */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 opacity-60">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Stethoscope className="w-5 h-5 text-blue-500" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                                    オンライン診療・処方
                                </h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
                                    提携医師によるオンライン診療で、医師の診断・処方が必要な医薬品を
                                    自宅に届けてもらえます。
                                </p>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                        <span className="w-2 h-2 bg-blue-400 rounded-full" />
                                        ED治療薬
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                        <span className="w-2 h-2 bg-indigo-400 rounded-full" />
                                        AGA（育毛）治療薬
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                        <span className="w-2 h-2 bg-violet-400 rounded-full" />
                                        禁酒補助薬
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                        <span className="w-2 h-2 bg-purple-400 rounded-full" />
                                        アンチエイジング
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 対応カテゴリ詳細 */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 opacity-60">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                                <Syringe className="w-5 h-5 text-violet-500" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                                    対応カテゴリ
                                </h3>
                                <div className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
                                    <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                        <span className="font-medium text-slate-700 dark:text-slate-200">ED治療</span>
                                        <p className="mt-1">バイアグラ、シアリス等のジェネリック医薬品</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                        <span className="font-medium text-slate-700 dark:text-slate-200">AGA（育毛）</span>
                                        <p className="mt-1">フィナステリド、ミノキシジル等の育毛治療薬</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                        <span className="font-medium text-slate-700 dark:text-slate-200">禁酒サポート</span>
                                        <p className="mt-1">アルコール依存改善のための補助薬</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                        <span className="font-medium text-slate-700 dark:text-slate-200">アンチエイジング</span>
                                        <p className="mt-1">GLP-1、成長ホルモン関連等の抗加齢医療</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 注意書き */}
            <div className="mt-8 p-4 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                    ※ 医薬品のオンライン処方には、提携医師によるオンライン診療が必要です。
                    <br />
                    診療結果によっては、処方できない場合があります。
                    <br />
                    サプリメントは健康補助食品であり、医薬品ではありません。
                </p>
            </div>
        </div>
    );
}
