'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, Activity, TrendingUp, Loader2, RefreshCw, AlertTriangle, ThumbsDown, Zap } from 'lucide-react';
import { getAllDataForExport } from '@/app/actions/report';

interface CategoryScore {
    id: string;
    name: string;
    rank: string;
    score: number;
    avgScore: number;
    reasoning: string;
}

interface AdviceItem {
    category: string;
    advice: string;
}

interface AnalysisResult {
    totalScore: number;
    categories: CategoryScore[];
    evaluation: string;
    advices: {
        belowAverage: AdviceItem[];
        badHabits: AdviceItem[];
        highImpact: AdviceItem[];
    };
}

const STORAGE_KEY = 'health_report_analysis_v3';

// ランクの色を取得
const getRankColor = (rank: string) => {
    switch (rank) {
        case 'SS': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
        case 'S': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
        case 'A': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
        case 'B': return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400';
        case 'C': return 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-500';
        default: return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400';
    }
};

export default function ReportClient() {
    const [copied, setCopied] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [lastAnalyzedAt, setLastAnalyzedAt] = useState<string | null>(null);

    // 前回の診断結果を読み込み
    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const data = JSON.parse(saved);
                setAnalysis(data.analysis);
                setLastAnalyzedAt(data.analyzedAt);
            } catch (e) {
                console.error('Failed to load saved analysis:', e);
            }
        }
    }, []);

    const handleExportAll = async () => {
        setIsExporting(true);
        setError(null);
        try {
            const result = await getAllDataForExport();
            if (result.success && result.text) {
                await navigator.clipboard.writeText(result.text);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } else {
                setError(result.error || 'データの取得に失敗しました');
            }
        } catch (err) {
            setError('エクスポートに失敗しました');
            console.error(err);
        } finally {
            setIsExporting(false);
        }
    };

    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        setError(null);
        try {
            const response = await fetch('/api/report/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '分析に失敗しました');
            }

            if (data.success && data.analysis) {
                setAnalysis(data.analysis);
                const now = new Date().toISOString();
                setLastAnalyzedAt(now);
                localStorage.setItem(STORAGE_KEY, JSON.stringify({
                    analysis: data.analysis,
                    analyzedAt: now
                }));
            } else {
                throw new Error('分析結果の取得に失敗しました');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '分析に失敗しました');
            console.error(err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 70) return 'text-emerald-500';
        if (score >= 50) return 'text-teal-500';
        if (score >= 30) return 'text-yellow-500';
        return 'text-red-500';
    };

    const getBarColor = (score: number, avgScore: number) => {
        const diff = score - avgScore;
        if (diff >= 10) return 'bg-emerald-500';
        if (diff >= 0) return 'bg-teal-500';
        if (diff >= -10) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const formatDate = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* ヘッダー */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                        健康レポート
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        健康プロフィールと診断記録を基にした分析結果
                    </p>
                </div>
                <button
                    onClick={handleExportAll}
                    disabled={isExporting}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                    {isExporting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : copied ? (
                        <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                        <Copy className="w-4 h-4" />
                    )}
                    {copied ? 'コピー完了' : '全データ出力'}
                </button>
            </div>

            {/* エラー表示 */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400">
                    {error}
                </div>
            )}

            {/* 総合スコアセクション */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                        総合スコア
                    </h2>
                    {lastAnalyzedAt && (
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                            最終診断: {formatDate(lastAnalyzedAt)}
                        </span>
                    )}
                </div>

                {/* 総合スコア円グラフ */}
                <div className="flex items-center justify-center py-4">
                    <div className="relative w-32 h-32">
                        <svg className="w-full h-full transform -rotate-90">
                            <circle
                                cx="64"
                                cy="64"
                                r="56"
                                stroke="currentColor"
                                strokeWidth="10"
                                fill="none"
                                className="text-slate-200 dark:text-slate-700"
                            />
                            {analysis && (
                                <circle
                                    cx="64"
                                    cy="64"
                                    r="56"
                                    stroke="currentColor"
                                    strokeWidth="10"
                                    fill="none"
                                    strokeDasharray={`${(analysis.totalScore / 100) * 352} 352`}
                                    strokeLinecap="round"
                                    className={getScoreColor(analysis.totalScore)}
                                />
                            )}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            {analysis ? (
                                <>
                                    <span className={`text-3xl font-bold ${getScoreColor(analysis.totalScore)}`}>
                                        {analysis.totalScore}
                                    </span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400">/ 100点</span>
                                </>
                            ) : (
                                <span className="text-slate-400 dark:text-slate-500 text-sm">未診断</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 総合評価セクション */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-5 h-5 text-teal-500" />
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                        総合評価
                    </h2>
                </div>
                {analysis ? (
                    <div className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                        {analysis.evaluation}
                    </div>
                ) : (
                    <p className="text-slate-400 dark:text-slate-500 text-center py-8">
                        診断を実行すると評価が表示されます
                    </p>
                )}
            </div>

            {/* カテゴリ別スコアセクション */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
                    カテゴリ別スコア
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                    同年代平均（縦線）との比較
                </p>

                <div className="space-y-4">
                    {analysis ? (
                        analysis.categories.map((cat) => (
                            <div key={cat.id} className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${getRankColor(cat.rank)}`}>
                                            {cat.rank}
                                        </span>
                                        {cat.name}
                                    </span>
                                    <span className={`font-medium ${getScoreColor(cat.score)}`}>
                                        {cat.score}点
                                        <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">
                                            (平均{cat.avgScore})
                                        </span>
                                    </span>
                                </div>
                                <div className="relative h-5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                    {/* ユーザーのスコアバー */}
                                    <div
                                        className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${getBarColor(cat.score, cat.avgScore)}`}
                                        style={{ width: `${cat.score}%` }}
                                    />
                                    {/* 平均マーカー */}
                                    <div
                                        className="absolute top-0 h-full w-0.5 bg-slate-800 dark:bg-white opacity-60"
                                        style={{ left: `${cat.avgScore}%` }}
                                    />
                                </div>
                                {cat.reasoning && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 pl-2 border-l-2 border-slate-200 dark:border-slate-600">
                                        {cat.reasoning}
                                    </p>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-slate-400 dark:text-slate-500 text-center py-8">
                            診断を実行するとカテゴリ別スコアが表示されます
                        </div>
                    )}
                </div>

                {analysis && (
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-0.5 bg-slate-800 dark:bg-white opacity-60" />
                            <span>同年代平均</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-emerald-500" />
                            <span>平均以上</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-yellow-500" />
                            <span>やや低い</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <span>要改善</span>
                        </div>
                    </div>
                )}
            </div>

            {/* 悪い習慣TOP3セクション */}
            <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-2xl border border-red-100 dark:border-red-800 p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <ThumbsDown className="w-5 h-5 text-red-500" />
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                        健康寿命に悪い習慣 TOP3
                    </h2>
                </div>
                {analysis ? (
                    analysis.advices?.badHabits && analysis.advices.badHabits.length > 0 ? (
                        <div className="space-y-3">
                            {analysis.advices.badHabits.map((item, index) => (
                                <div
                                    key={index}
                                    className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-4"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="w-6 h-6 flex items-center justify-center bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-full text-sm font-bold">
                                            {index + 1}
                                        </span>
                                        <span className="font-medium text-slate-800 dark:text-slate-100">
                                            {item.category}
                                        </span>
                                    </div>
                                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed pl-8">
                                        {item.advice}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-400 dark:text-slate-500 text-center py-4">
                            特に悪い習慣は見つかりませんでした
                        </p>
                    )
                ) : (
                    <p className="text-slate-400 dark:text-slate-500 text-center py-8">
                        診断を実行すると表示されます
                    </p>
                )}
            </div>

            {/* 改善効果TOP3セクション */}
            <div className="bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 rounded-2xl border border-teal-100 dark:border-teal-800 p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-emerald-500" />
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                        改善効果が高い施策 TOP3
                    </h2>
                </div>
                {analysis ? (
                    analysis.advices?.highImpact && analysis.advices.highImpact.length > 0 ? (
                        <div className="space-y-3">
                            {analysis.advices.highImpact.map((item, index) => (
                                <div
                                    key={index}
                                    className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-4"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="w-6 h-6 flex items-center justify-center bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 rounded-full text-sm font-bold">
                                            {index + 1}
                                        </span>
                                        <span className="font-medium text-slate-800 dark:text-slate-100">
                                            {item.category}
                                        </span>
                                    </div>
                                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed pl-8">
                                        {item.advice}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-slate-400 dark:text-slate-500 text-center py-4">
                            改善施策が見つかりませんでした
                        </p>
                    )
                ) : (
                    <p className="text-slate-400 dark:text-slate-500 text-center py-8">
                        診断を実行すると表示されます
                    </p>
                )}
            </div>

            {/* 平均以下のカテゴリ改善アドバイス */}
            {analysis && analysis.advices?.belowAverage && analysis.advices.belowAverage.length > 0 && (
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-2xl border border-amber-100 dark:border-amber-800 p-6 mb-6">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                            平均以下のカテゴリ改善
                        </h2>
                    </div>
                    <div className="space-y-3">
                        {analysis.advices.belowAverage.map((item, index) => (
                            <div
                                key={index}
                                className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-4"
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                                    <span className="font-medium text-slate-800 dark:text-slate-100">
                                        {item.category}
                                    </span>
                                </div>
                                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                                    {item.advice}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 再診断ボタン */}
            <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="w-full py-4 px-4 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-teal-500/25"
            >
                {isAnalyzing ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        診断中...（1分ほどかかります）
                    </>
                ) : (
                    <>
                        <RefreshCw className="w-5 h-5" />
                        {analysis ? '再診断する' : '診断を実行'}
                    </>
                )}
            </button>

            {/* 注意書き */}
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-4">
                ※ このアドバイスは一般的な健康情報であり、医学的な診断ではありません。
                <br />
                具体的な健康上の問題については医療機関にご相談ください。
            </p>
        </div>
    );
}
