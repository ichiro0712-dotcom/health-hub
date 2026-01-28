'use client';

import { ArrowRight, AlertTriangle, Download, List, ChevronLeft, Merge, Loader2, RefreshCcw, History, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { getUniqueItems, mergeItems, UniqueItem, getMergeHistory, undoMerge, MergeHistory, getExportData } from '@/app/actions/items';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export default function MergeItemsPage() {
    const [items, setItems] = useState<UniqueItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMerging, setIsMerging] = useState(false);
    const [mergeInput, setMergeInput] = useState('');

    const [history, setHistory] = useState<MergeHistory[]>([]);
    const [activeTab, setActiveTab] = useState<'input' | 'history'>('input');


    useEffect(() => {
        fetchItems();
        fetchHistory();
    }, []);

    const fetchItems = async () => {
        setIsLoading(true);
        const res = await getUniqueItems();
        if (res.success && res.data) {
            setItems(res.data);
        } else {
            toast.error(`項目の取得に失敗しました: ${res.error || '不明なエラー'}`);
            console.error(res.error);
        }
        setIsLoading(false);
    };

    const handleDownloadExport = async (mode: 'original' | 'integrated') => {
        const toastId = toast.loading(`${mode === 'original' ? 'オリジナル' : '統合済み'}CSVを作成中...`);
        const res = await getExportData(mode);

        if (!res.success || !res.data) {
            toast.error(`CSV作成に失敗しました: ${res.error}`, { id: toastId });
            return;
        }

        if (res.data.length === 0) {
            toast.success('データが存在しません', { id: toastId });
            return;
        }

        const header = "RecordID,日付,項目名,値,単位,基準値\n";
        const rows = res.data.map(r =>
            `"${r.id}","${r.date}","${r.itemName}","${r.value}","${r.unit}","${r.refRange}"`
        ).join("\n");

        const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `health_data_${mode}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url); // メモリリーク対策
        toast.dismiss(toastId);
    };

    const [resultLogs, setResultLogs] = useState<string[]>([]);

    const handleMerge = async () => {
        if (!mergeInput.trim()) {
            toast.error("統合ルールを入力してください");
            return;
        }

        const confirmed = confirm("本当に統合しますか？この操作は取り消せません。\nCSVをダウンロードしてバックアップを取ることを強く推奨します。");
        if (!confirmed) return;

        setIsMerging(true);
        setResultLogs([]); // Clear previous logs

        // Parse input: "1,4/2,5/" -> [{survivor:1, victim:4}, ...]
        const pairs: { survivorId: number, victimId: number }[] = [];
        const rawPairs = mergeInput.split('/').filter(s => s.trim());

        for (const raw of rawPairs) {
            const [survivor, victim] = raw.split(',').map(s => parseInt(s.trim()));
            if (!isNaN(survivor) && !isNaN(victim)) {
                pairs.push({ survivorId: survivor, victimId: victim });
            }
        }

        if (pairs.length === 0) {
            toast.error("有効な統合ルールが見つかりません");
            setIsMerging(false);
            return;
        }

        const res = await mergeItems(pairs);
        if (res.logs) {
            setResultLogs(res.logs);
        }

        if (res.success) {
            toast.success("統合処理が完了しました");
            setMergeInput(''); // Clear input
            await fetchItems(); // Refresh list
            await fetchHistory();
        } else {
            toast.error(`統合に失敗しました: ${res.error || '不明なエラー'}`);
        }
        setIsMerging(false);
    };

    // ID Refresh (Reset) Button logic
    const handleRefresh = async () => {
        await fetchItems();
        toast.success("番号を振り直しました");
    };

    const fetchHistory = async () => {
        const res = await getMergeHistory();
        setHistory(res);
    };

    const handleUndo = async (historyId: string) => {
        if (!confirm('この統合を取り消しますか？')) return;

        const toastId = toast.loading('取り消し中...');
        const res = await undoMerge(historyId);

        if (res.success) {
            toast.success('統合を取り消しました', { id: toastId });
            await fetchItems();
            await fetchHistory();
        } else {
            toast.error(`取り消しに失敗しました: ${res.error}`, { id: toastId });
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-20">
            <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
                <div className="flex items-center gap-2 mb-6">
                    <Link href="/profile" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                        <ChevronLeft className="w-6 h-6" />
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">検査項目の統合</h1>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg p-4 mb-6">
                    <div className="flex gap-2 text-amber-800 dark:text-amber-200 text-sm font-bold items-center mb-1">
                        <AlertTriangle className="w-4 h-4" />
                        <span>注意: この操作は取り消せません</span>
                    </div>
                    <p className="text-xs text-amber-700 dark:text-amber-300 pl-6">
                        指定した検査項目のデータを全て別の項目名に書き換えます。<br />
                        事前のバックアップ(一括DL)を強く推奨します。
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column: List (Takes 2 cols on large screens) */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 flex flex-col h-[600px]">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <List className="w-4 h-4" />
                                検出された項目一覧
                            </h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleRefresh}
                                    title="番号を振り直す"
                                    className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-md transition-colors"
                                >
                                    <RefreshCcw className="w-4 h-4" />
                                </button>
                                <div className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded transition-colors p-0.5">
                                    <button
                                        onClick={() => handleDownloadExport('original')}
                                        className="px-2 py-1 text-[10px] text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 font-medium"
                                        title="統合前の元データを出力"
                                    >
                                        元データ
                                    </button>
                                    <div className="w-px h-3 bg-slate-300 dark:bg-slate-600"></div>
                                    <button
                                        onClick={() => handleDownloadExport('integrated')}
                                        className="px-2 py-1 text-[10px] text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 font-medium"
                                        title="統合ルール適用後のデータを出力"
                                    >
                                        統合済
                                    </button>
                                    <div className="pr-1 text-slate-400">
                                        <Download className="w-3 h-3" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                            {isLoading ? (
                                <div className="flex items-center justify-center h-full text-slate-400">
                                    <Loader2 className="w-6 h-6 animate-spin" />
                                </div>
                            ) : items.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                                    項目が見つかりません
                                </div>
                            ) : (
                                items.map((item) => (
                                    <div key={item.id} className="flex justify-between items-center px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-slate-700/50 border border-gray-100 dark:border-slate-700 text-sm hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors group">
                                        <div className="flex items-center gap-3">
                                            <span className="w-6 h-6 rounded bg-white dark:bg-slate-600 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-300 border border-gray-200 dark:border-slate-600">
                                                {item.id}
                                            </span>
                                            <span className="font-medium text-slate-700 dark:text-slate-200">{item.name}</span>
                                        </div>
                                        <span className="text-xs text-slate-400 bg-white dark:bg-slate-600 px-2 py-0.5 rounded-full border border-gray-100 dark:border-slate-600">
                                            {item.count}件
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right Column: Tabs (Rule Input / History) */}
                    <div className="lg:col-span-1 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col h-[600px]">
                        {/* Tabs Header */}
                        <div className="flex border-b border-gray-100 dark:border-slate-700">
                            <button
                                onClick={() => setActiveTab('input')}
                                className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'input'
                                    ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/50 dark:bg-teal-900/10'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
                                    }`}
                            >
                                <Merge className="w-4 h-4" />
                                ルール入力
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === 'history'
                                    ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/50 dark:bg-teal-900/10'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200'
                                    }`}
                            >
                                <History className="w-4 h-4" />
                                操作履歴
                            </button>
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 p-6 overflow-hidden flex flex-col">
                            {activeTab === 'input' ? (
                                <div className="flex-1 flex flex-col gap-4 animate-in fade-in duration-200">
                                    <div className="bg-gray-50 dark:bg-slate-900 p-3 rounded-lg text-xs space-y-1 text-slate-600 dark:text-slate-400 border border-gray-100 dark:border-slate-700">
                                        <p className="font-bold mb-1">入力フォーマット:</p>
                                        <p className="font-mono bg-white dark:bg-slate-800 p-1.5 rounded border border-gray-200 dark:border-slate-600">
                                            残すID,消すID/残すID,消すID/
                                        </p>
                                        <p className="pt-1 text-[10px] text-slate-500">
                                            例: <span className="font-mono">1,4/</span> (ID:4をID:1に統合)<br />
                                            複数指定可能。末尾にスラッシュ必須。
                                        </p>
                                    </div>

                                    <textarea
                                        value={mergeInput}
                                        onChange={(e) => setMergeInput(e.target.value)}
                                        placeholder="例: 1,4/2,5/"
                                        className="flex-1 w-full p-4 rounded-lg bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm font-mono focus:ring-2 focus:ring-teal-500 outline-none resize-none dark:text-white min-h-[120px]"
                                    />

                                    <button
                                        onClick={handleMerge}
                                        disabled={isMerging || !mergeInput.trim()}
                                        className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold shadow-sm shadow-teal-200 dark:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isMerging ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                処理中...
                                            </>
                                        ) : (
                                            <>
                                                <Merge className="w-4 h-4" />
                                                実行する
                                            </>
                                        )}
                                    </button>

                                    {resultLogs.length > 0 && (
                                        <div className="mt-2 p-3 bg-slate-900 text-slate-300 rounded-lg text-xs font-mono max-h-40 overflow-y-auto whitespace-pre-wrap">
                                            <div className="font-bold text-white mb-2 sticky top-0 bg-slate-900 pb-2 border-b border-slate-700">実行ログ:</div>
                                            {resultLogs.map((log, i) => (
                                                <div key={i} className={`${log.includes('[ERROR]') ? 'text-red-400' : log.includes('[WARN]') ? 'text-amber-400' : ''}`}>
                                                    {log}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-3 animate-in fade-in duration-200">
                                    {history.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                                            <History className="w-8 h-8 opacity-20" />
                                            <p className="text-xs">履歴はありません</p>
                                        </div>
                                    ) : (
                                        history.map((h) => (
                                            <div key={h.id} className="text-xs bg-slate-50 dark:bg-slate-700/30 p-3 rounded-lg border border-slate-100 dark:border-slate-700 space-y-2">
                                                <div className="flex justify-between items-start">
                                                    <div className="font-medium text-slate-700 dark:text-slate-300">
                                                        {h.description}
                                                    </div>
                                                    <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                                                        {new Date(h.date).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                {h.canUndo && (
                                                    <button
                                                        onClick={() => handleUndo(h.id)}
                                                        className="w-full py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded text-slate-500 dark:text-slate-400 hover:text-red-500 hover:border-red-200 dark:hover:border-red-900 transition-colors flex items-center justify-center gap-1"
                                                    >
                                                        <RotateCcw className="w-3 h-3" />
                                                        元に戻す
                                                    </button>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
