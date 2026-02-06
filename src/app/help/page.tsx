import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Link from "next/link";
import {
    Heart,
    FileText,
    BarChart2,
    Activity,
    MessageSquare,
    Smartphone,
    FileSpreadsheet,
    Camera,
    Keyboard,
    Watch,
    ChevronRight,
    HelpCircle,
    Zap,
} from "lucide-react";

export const metadata = {
    title: "ヘルプ・FAQ | Health Hub",
    description: "Health Hubの使い方やよくある質問",
};

export default async function HelpPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/');

    return (
        <main className="min-h-screen pb-24 bg-slate-50 dark:bg-slate-900">
            <Header />
            <div className="max-w-3xl mx-auto px-4 md:px-6 pt-6 space-y-6">
                {/* Page Title */}
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <HelpCircle className="w-7 h-7 text-teal-500" />
                        ヘルプ・FAQ
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Health Hubの使い方やよくある質問をまとめています
                    </p>
                </div>

                {/* Quick Start */}
                <section className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-xl p-6 text-white">
                    <h2 className="text-lg font-bold flex items-center gap-2 mb-3">
                        <Zap className="w-5 h-5" />
                        はじめての方へ
                    </h2>
                    <div className="space-y-2 text-teal-50 text-sm">
                        <p>Health Hubは、あなたの健康データを一元管理し、AIが分析・アドバイスを提供するサービスです。</p>
                        <ol className="list-decimal list-inside space-y-1 ml-1">
                            <li>まずは<strong className="text-white">健康プロフィール</strong>をAIチャットで作成しましょう</li>
                            <li><strong className="text-white">健康診断の結果</strong>を写真アップロードまたは手入力で登録</li>
                            <li>スマートウォッチをお持ちなら<strong className="text-white">Fitbit連携</strong>で自動同期</li>
                            <li><strong className="text-white">データ推移</strong>で経年変化をチェック</li>
                        </ol>
                    </div>
                </section>

                {/* Main Features */}
                <section className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-slate-700">
                        <h2 className="font-bold text-slate-800 dark:text-gray-200">主な機能</h2>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-slate-700">
                        <FeatureItem
                            icon={<Heart className="w-4 h-4" />}
                            iconBg="bg-rose-50 dark:bg-rose-900/30 text-rose-500 dark:text-rose-400"
                            title="健康プロフィール"
                            description="AIチャットで対話しながら健康情報を整理。基本属性、病歴、生活リズム、食生活など11のカテゴリで管理できます。"
                            href="/health-profile"
                        />
                        <FeatureItem
                            icon={<MessageSquare className="w-4 h-4" />}
                            iconBg="bg-teal-50 dark:bg-teal-900/30 text-teal-500 dark:text-teal-400"
                            title="AIチャット"
                            description="健康プロフィールの作成・更新、診断データの分析・アドバイス、Health Hubの使い方サポートをAIがお手伝いします。右下のメニューから開けます。"
                            href="/help"
                        />
                        <FeatureItem
                            icon={<FileText className="w-4 h-4" />}
                            iconBg="bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400"
                            title="診断記録"
                            description="健康診断の結果を管理。写真をアップロードするとAIが自動で読み取ります（OCR）。手入力にも対応。"
                            href="/records"
                        />
                        <FeatureItem
                            icon={<BarChart2 className="w-4 h-4" />}
                            iconBg="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-400"
                            title="データ推移"
                            description="検査値やスマホデータの推移をグラフ・表で可視化。基準値との比較や経年変化の確認に便利です。"
                            href="/trends"
                        />
                        <FeatureItem
                            icon={<Activity className="w-4 h-4" />}
                            iconBg="bg-green-50 dark:bg-green-900/30 text-green-500 dark:text-green-400"
                            title="習慣トラッキング"
                            description="日々の生活習慣やサプリメントの服用状況を記録できます。"
                            href="/habits"
                        />
                    </div>
                </section>

                {/* Data Input Methods */}
                <section className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-slate-700">
                        <h2 className="font-bold text-slate-800 dark:text-gray-200">データの入力方法</h2>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-slate-700">
                        <FeatureItem
                            icon={<Camera className="w-4 h-4" />}
                            iconBg="bg-purple-50 dark:bg-purple-900/30 text-purple-500 dark:text-purple-400"
                            title="写真アップロード（AI自動読み取り）"
                            description="健康診断結果の写真をアップロードすると、AIが検査項目と数値を自動で読み取って登録します。"
                            href="/records"
                        />
                        <FeatureItem
                            icon={<Keyboard className="w-4 h-4" />}
                            iconBg="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                            title="手入力"
                            description="検査値を直接入力して登録することもできます。診断記録ページの「新規追加」から入力してください。"
                            href="/records"
                        />
                        <FeatureItem
                            icon={<Watch className="w-4 h-4" />}
                            iconBg="bg-cyan-50 dark:bg-cyan-900/30 text-cyan-500 dark:text-cyan-400"
                            title="スマートウォッチ連携"
                            description="Fitbit・Health Connect経由で心拍数、睡眠、歩数などを自動取り込みできます。"
                            href="/settings/data-sync"
                        />
                    </div>
                </section>

                {/* External Integrations */}
                <section className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-slate-700">
                        <h2 className="font-bold text-slate-800 dark:text-gray-200">外部連携</h2>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-slate-700">
                        <FeatureItem
                            icon={<Watch className="w-4 h-4" />}
                            iconBg="bg-teal-50 dark:bg-teal-900/30 text-teal-500 dark:text-teal-400"
                            title="Fitbit連携"
                            description="OAuth認証でFitbitアカウントと接続。心拍数、睡眠データ、HRV（心拍変動）、歩数などを毎日自動同期します。"
                            href="/settings/fitbit"
                        />
                        <FeatureItem
                            icon={<Smartphone className="w-4 h-4" />}
                            iconBg="bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400"
                            title="Android Health Connect"
                            description="スマホのHealth Connectアプリを通じて、Garmin、Samsung、その他のヘルスアプリのデータも同期可能です。"
                            href="/settings/data-sync"
                        />
                        <FeatureItem
                            icon={<FileSpreadsheet className="w-4 h-4" />}
                            iconBg="bg-green-50 dark:bg-green-900/30 text-green-500 dark:text-green-400"
                            title="Google Docs連携"
                            description="健康プロフィールと診断記録をGoogle Docsに自動エクスポート。ChatGPTやGeminiなど外部AIとのデータ共有に利用できます。"
                            href="/settings/google-docs"
                        />
                    </div>
                </section>

                {/* FAQ */}
                <section className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-slate-700">
                        <h2 className="font-bold text-slate-800 dark:text-gray-200">よくある質問</h2>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-slate-700">
                        <FaqItem
                            question="データは安全ですか？"
                            answer="はい。データはユーザーごとに分離して管理されており、他のユーザーからアクセスできません。Google Docs連携を使う場合も、あなた自身のGoogleアカウントに保存されます。"
                        />
                        <FaqItem
                            question="AIチャットではどんなことができますか？"
                            answer="3つの機能があります。①健康プロフィールの作成・更新（対話形式で健康情報を整理）、②健康データの分析・アドバイス（診断結果の傾向分析や生活改善の提案）、③Health Hubの使い方サポートです。"
                        />
                        <FaqItem
                            question="健康診断の写真はどう撮ればいいですか？"
                            answer="検査結果が読み取れるよう、明るい場所で水平に撮影してください。複数ページある場合は1ページずつアップロードできます。AIが自動で検査項目と数値を読み取ります。"
                        />
                        <FaqItem
                            question="Fitbit以外のスマートウォッチは使えますか？"
                            answer="Android端末をお持ちの場合、Health Connectアプリを経由してGarmin、Samsung Galaxy Watchなど多くのデバイスのデータを取り込めます。iPhoneのApple Healthには現在対応していません。"
                        />
                        <FaqItem
                            question="Google Docs連携は何に使いますか？"
                            answer="健康プロフィールや診断記録をGoogle Docsに自動エクスポートします。これにより、ChatGPTやGeminiなど外部AIにあなたの健康データを簡単に共有し、より詳しい分析やアドバイスを受けることができます。"
                        />
                        <FaqItem
                            question="健康プロフィールの11カテゴリとは？"
                            answer="基本属性・バイオメトリクス、遺伝・家族歴、病歴・医療ステータス、生理機能・体質、生活リズム、食生活・栄養、嗜好品・サプリメント・薬、運動・身体活動、メンタル・脳機能、美容・衛生習慣、環境・社会・ライフスタイルの11項目です。"
                        />
                        <FaqItem
                            question="データを削除したい場合は？"
                            answer="個別の診断記録は診断記録ページから削除できます。健康プロフィールの特定の項目はAIチャットで「〇〇を削除して」と伝えると対応します。アカウント自体の削除についてはお問い合わせください。"
                        />
                    </div>
                </section>

                {/* Contact */}
                <section className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        その他ご不明な点は、右下メニューの「AIチャット」で聞いてみてください。
                    </p>
                </section>
            </div>
        </main>
    );
}

function FeatureItem({
    icon,
    iconBg,
    title,
    description,
    href,
}: {
    icon: React.ReactNode;
    iconBg: string;
    title: string;
    description: string;
    href: string;
}) {
    return (
        <Link href={href} className="flex items-start gap-3 p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${iconBg}`}>
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-gray-900 dark:text-gray-100">{title}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{description}</div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
        </Link>
    );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
    return (
        <details className="group">
            <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors list-none">
                <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{question}</span>
                <ChevronRight className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-90 flex-shrink-0 ml-2" />
            </summary>
            <div className="px-4 pb-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {answer}
            </div>
        </details>
    );
}
