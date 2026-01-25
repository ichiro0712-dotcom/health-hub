'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, Activity, TrendingUp, Loader2, RefreshCw, AlertTriangle, ThumbsDown, Zap, X } from 'lucide-react';
import { analyzeHealthData } from '@/app/actions/analyze-health';
import { getAllDataForExport } from '@/app/actions/report';

interface CategoryScore {
    id: string;
    name: string;
    rank: string;
    score: number;
    avgScore: number;
    summary: string;
    detail: string;
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

interface ReportClientProps {
    userEmail: string;
}

export default function ReportClient({ userEmail }: ReportClientProps) {
    const [copied, setCopied] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [lastAnalyzedAt, setLastAnalyzedAt] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<CategoryScore | null>(null);

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
            // Server Actionを呼び出す（emailを渡す）
            const result = await analyzeHealthData(userEmail);

            if (!result.success) {
                throw new Error(result.error || '分析に失敗しました');
            }

            if (result.analysis) {
                setAnalysis(result.analysis);
                const now = new Date().toISOString();
                setLastAnalyzedAt(now);
                localStorage.setItem(STORAGE_KEY, JSON.stringify({
                    analysis: result.analysis,
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

    // 偏差値を計算（-10〜+10の範囲）
    const getDeviation = (score: number, avgScore: number) => {
        const deviation = (score - avgScore) / 5;
        return Math.max(-10, Math.min(10, deviation));
    };

    // 偏差値の色を取得
    const getDeviationColor = (deviation: number) => {
        if (deviation >= 4) return 'bg-emerald-500';
        if (deviation >= 0) return 'bg-teal-500';
        if (deviation >= -4) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    // 偏差値の表示テキスト
    const formatDeviation = (deviation: number) => {
        const rounded = Math.round(deviation * 10) / 10;
        return rounded >= 0 ? `+${rounded}` : `${rounded}`;
    };

    // 偏差値からランクを算出
    const getDeviationRank = (deviation: number) => {
        if (deviation >= 8) return 'SS';
        if (deviation >= 5) return 'S';
        if (deviation >= 2) return 'A';
        if (deviation >= -1) return 'B';
        if (deviation >= -4) return 'C';
        if (deviation >= -7) return 'D';
        return 'E';
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
        <>
            {/* スコア詳細モーダル */}
            {selectedCategory && (
                <div
                    className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                    onClick={() => setSelectedCategory(null)}
                >
                    <div
                        className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-lg w-full p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                                        {selectedCategory.name}
                                    </h3>
                                </div>
                                <div className="flex items-center gap-4 text-sm">
                                    <span className={`font-bold text-2xl ${getScoreColor(selectedCategory.score)}`}>
                                        {selectedCategory.score}点
                                    </span>
                                    <span className="text-slate-500 dark:text-slate-400">
                                        平均: {selectedCategory.avgScore}点
                                    </span>
                                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${getRankColor(getDeviationRank(getDeviation(selectedCategory.score, selectedCategory.avgScore)))}`}>
                                        {getDeviationRank(getDeviation(selectedCategory.score, selectedCategory.avgScore))}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedCategory(null)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="mb-4">
                            <div className="relative h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${
                                        selectedCategory.score >= 70 ? 'bg-emerald-500' :
                                        selectedCategory.score >= 50 ? 'bg-teal-500' :
                                        selectedCategory.score >= 30 ? 'bg-yellow-500' :
                                        'bg-red-500'
                                    }`}
                                    style={{ width: `${selectedCategory.score}%` }}
                                />
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 space-y-3">
                            <div>
                                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    要点
                                </h4>
                                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                                    {selectedCategory.summary || '要点の説明はありません。'}
                                </p>
                            </div>
                            <div>
                                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    詳細
                                </h4>
                                <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                                    {selectedCategory.detail || '詳細な説明はありません。'}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => setSelectedCategory(null)}
                            className="mt-6 w-full py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-medium transition-colors"
                        >
                            閉じる
                        </button>
                    </div>
                </div>
            )}

        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* ヘッダー */}
            <div className="mb-6">
                <div className="mb-4">
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                        Healthレポート
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        健康プロフィールと診断記録を基にした分析結果
                    </p>
                </div>
                {/* モバイル：縦並び、PC：横並び */}
                <div className="flex flex-col sm:flex-row gap-2">
                    <button
                        onClick={handleAnalyze}
                        disabled={isAnalyzing}
                        className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-xl sm:rounded-lg font-medium transition-colors disabled:opacity-50 flex-1 sm:flex-initial"
                    >
                        {isAnalyzing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4" />
                        )}
                        {isAnalyzing ? '診断中...' : '再診断'}
                    </button>
                    <button
                        onClick={handleExportAll}
                        disabled={isExporting}
                        className="flex items-center justify-center gap-2 px-4 py-3 sm:py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl sm:rounded-lg font-medium transition-colors disabled:opacity-50 flex-1 sm:flex-initial"
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
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                    同年代平均との比較（中央が平均、右が+、左が-）
                </p>
                <p className="text-xs text-teal-600 dark:text-teal-400 mb-4">
                    💡 各項目をクリックすると詳しい説明が表示されます
                </p>

                <div className="space-y-4">
                    {analysis ? (
                        analysis.categories.map((cat) => {
                            const deviation = getDeviation(cat.score, cat.avgScore);
                            const barWidth = Math.abs(deviation) * 5; // 最大50%（片側）
                            const isPositive = deviation >= 0;

                            return (
                                <div
                                    key={cat.id}
                                    className="space-y-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg p-2 -mx-2 transition-colors"
                                    onClick={() => setSelectedCategory(cat)}
                                >
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-slate-700 dark:text-slate-300">
                                            {cat.name}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className={`font-medium ${deviation >= 0 ? 'text-emerald-500' : deviation >= -4 ? 'text-yellow-500' : 'text-red-500'}`}>
                                                {formatDeviation(deviation)}
                                            </span>
                                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${getRankColor(getDeviationRank(deviation))}`}>
                                                {getDeviationRank(deviation)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="relative h-5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                        {/* 中央線（平均） */}
                                        <div className="absolute top-0 left-1/2 h-full w-0.5 bg-slate-400 dark:bg-slate-500 z-10" />

                                        {/* 偏差バー */}
                                        {isPositive ? (
                                            // プラス：中央から右へ
                                            <div
                                                className={`absolute top-0 h-full rounded-r-full transition-all duration-500 ${getDeviationColor(deviation)}`}
                                                style={{
                                                    left: '50%',
                                                    width: `${barWidth}%`
                                                }}
                                            />
                                        ) : (
                                            // マイナス：中央から左へ
                                            <div
                                                className={`absolute top-0 h-full rounded-l-full transition-all duration-500 ${getDeviationColor(deviation)}`}
                                                style={{
                                                    right: '50%',
                                                    width: `${barWidth}%`
                                                }}
                                            />
                                        )}
                                    </div>
                                    {/* 要点を常時表示 */}
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pl-2">
                                        {cat.summary}
                                    </p>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-slate-400 dark:text-slate-500 text-center py-8">
                            診断を実行するとカテゴリ別スコアが表示されます
                        </div>
                    )}
                </div>

                {analysis && (
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                            <span className="text-slate-600 dark:text-slate-300">-10</span>
                            <div className="flex items-center h-3 w-24">
                                <div className="h-full w-1/2 bg-gradient-to-r from-red-500 via-yellow-500 to-slate-300 dark:to-slate-600 rounded-l-full" />
                                <div className="h-full w-0.5 bg-slate-400" />
                                <div className="h-full w-1/2 bg-gradient-to-r from-slate-300 dark:from-slate-600 via-teal-500 to-emerald-500 rounded-r-full" />
                            </div>
                            <span className="text-slate-600 dark:text-slate-300">+10</span>
                        </div>
                        <span className="text-slate-400">|</span>
                        <span>中央線 = 同年代平均</span>
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

            {/* 注意書き */}
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-4">
                ※ このアドバイスは一般的な健康情報であり、医学的な診断ではありません。
                <br />
                具体的な健康上の問題については医療機関にご相談ください。
            </p>
        </div>
        </>
    );
}
