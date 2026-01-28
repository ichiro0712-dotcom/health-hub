'use client';

import { useState } from 'react';
import { Download, ChevronDown, FileText, Table, Activity, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface RecordData {
    id: string;
    date: Date;
    title: string | null;
    summary: string | null;
    data: any;
    additional_data: any;
}

interface Habit {
    id: string;
    name: string;
    type: 'yes_no' | 'numeric';
    unit: string | null;
    records: HabitRecord[];
}

interface HabitRecord {
    date: Date;
    value: number | null;
}

interface ExportDataButtonProps {
    records?: RecordData[];
    habits?: Habit[];
    showRecords?: boolean;
    showHabits?: boolean;
}

// 期間の定義
type PeriodKey = 'week' | 'threeMonths' | 'halfYear' | 'year' | 'all';
const PERIODS: { key: PeriodKey; label: string; days: number | null; weeksLabel: string }[] = [
    { key: 'week', label: '過去1週間', days: 7, weeksLabel: '1週間' },
    { key: 'threeMonths', label: '過去3ヶ月', days: 90, weeksLabel: '約13週' },
    { key: 'halfYear', label: '過去半年', days: 182, weeksLabel: '約26週' },
    { key: 'year', label: '過去1年', days: 365, weeksLabel: '52週' },
    { key: 'all', label: '全期間', days: null, weeksLabel: '全期間' },
];

export default function ExportDataButton({
    records = [],
    habits = [],
    showRecords = true,
    showHabits = true
}: ExportDataButtonProps) {
    const [showMenu, setShowMenu] = useState(false);

    // 診断記録をフォーマット
    const formatRecordText = (record: RecordData): string => {
        const lines: string[] = [];
        const meta = record.additional_data || {};
        const results = record.data?.results || (Array.isArray(record.data) ? record.data : []);

        lines.push(`＜${format(new Date(record.date), 'yyyy/MM/dd')} 診断ファイル詳細＞`);
        if (record.title) {
            lines.push(`タイトル: ${record.title}`);
        }
        if (meta.hospitalName) {
            lines.push(`病院名: ${meta.hospitalName}`);
        }
        if (record.summary) {
            lines.push(`要点: ${record.summary}`);
        }
        lines.push('');

        if (results.length > 0) {
            lines.push(`[検査結果]`);
            results.forEach((item: any) => {
                const name = item.item || item.name || '';
                const value = item.value || '';
                const unit = item.unit || '';
                const evaluation = item.evaluation || '';

                const evalStr = evaluation ? ` (${evaluation})` : '';
                const unitStr = unit ? ` ${unit}` : '';
                lines.push(`${name}: ${value}${unitStr}${evalStr}`);
            });
            lines.push('');
        }

        const sections = meta.sections || [];
        if (sections.length > 0) {
            sections.forEach((sec: any) => {
                if (sec.title || sec.content) {
                    lines.push(`[${sec.title || 'メモ'}]`);
                    if (sec.content) {
                        lines.push(sec.content);
                    }
                    lines.push('');
                }
            });
        }

        return lines.join('\n').trim();
    };

    // 週平均を計算する関数
    const calculateWeeklyAverage = (habit: Habit, startDate: Date | null): { avg: number; hasData: boolean } => {
        const now = new Date();
        const filteredRecords = habit.records.filter((r) => {
            if (!startDate) return true; // 全期間
            const recordDate = new Date(r.date);
            return recordDate >= startDate && recordDate <= now;
        });

        if (filteredRecords.length === 0) {
            return { avg: 0, hasData: false };
        }

        // 合計値を計算
        const total = filteredRecords.reduce((sum, r) => sum + (r.value ?? 0), 0);

        // 期間の週数を計算
        let weeks: number;
        if (startDate) {
            const diffDays = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            weeks = Math.max(1, diffDays / 7);
        } else {
            // 全期間: 最初の記録から現在まで
            const dates = filteredRecords.map(r => new Date(r.date).getTime());
            const minDate = Math.min(...dates);
            const diffDays = Math.ceil((now.getTime() - minDate) / (1000 * 60 * 60 * 24));
            weeks = Math.max(1, diffDays / 7);
        }

        return { avg: total / weeks, hasData: true };
    };

    // 習慣データを週平均テキスト形式でエクスポート
    const exportHabitsWeeklyAverage = () => {
        if (habits.length === 0) {
            toast.error('習慣データがありません');
            setShowMenu(false);
            return;
        }

        const now = new Date();
        const lines: string[] = [];
        lines.push('【習慣 週平均サマリー】');
        lines.push(`出力日時: ${format(now, 'yyyy/MM/dd HH:mm')}`);
        lines.push('');

        PERIODS.forEach((period) => {
            let startDate: Date | null = null;
            if (period.days !== null) {
                startDate = new Date(now.getTime() - period.days * 24 * 60 * 60 * 1000);
            }

            // この期間にデータがある習慣のみ抽出
            const habitsWithData: { name: string; avg: number; unit: string | null; type: string }[] = [];

            habits.forEach((habit) => {
                const { avg, hasData } = calculateWeeklyAverage(habit, startDate);
                if (hasData) {
                    habitsWithData.push({
                        name: habit.name,
                        avg,
                        unit: habit.unit,
                        type: habit.type,
                    });
                }
            });

            if (habitsWithData.length > 0) {
                lines.push(`＜${period.label}（${period.weeksLabel}）＞`);
                habitsWithData.forEach((h) => {
                    const avgFormatted = h.avg % 1 === 0 ? h.avg.toString() : h.avg.toFixed(1);
                    if (h.type === 'yes_no') {
                        lines.push(`${h.name}: ${avgFormatted}回/週`);
                    } else {
                        lines.push(`${h.name}: ${avgFormatted}${h.unit || ''}/週`);
                    }
                });
                lines.push('');
            }
        });

        const text = lines.join('\n').trim();

        navigator.clipboard.writeText(text).then(() => {
            toast.success('週平均データをコピーしました');
            setShowMenu(false);
        }).catch(() => {
            toast.error('コピーに失敗しました');
            setShowMenu(false);
        });
    };

    // 診断記録をコピー
    const handleCopyRecords = (copyAll: boolean) => {
        if (records.length === 0) {
            toast.error('コピーするデータがありません');
            setShowMenu(false);
            return;
        }

        let text = '';

        if (copyAll) {
            text += `【全記録データ】（${records.length}件）\n`;
            text += `出力日時: ${format(new Date(), 'yyyy/MM/dd HH:mm')}\n`;
            text += '━'.repeat(30) + '\n\n';

            records.forEach((record, index) => {
                if (index > 0) {
                    text += '\n' + '─'.repeat(30) + '\n\n';
                }
                text += formatRecordText(record);
            });
        } else {
            const latest = records[0];
            text += formatRecordText(latest);
        }

        navigator.clipboard.writeText(text).then(() => {
            toast.success(copyAll ? `${records.length}件の記録をコピーしました` : '最新の記録をコピーしました');
            setShowMenu(false);
        }).catch(() => {
            toast.error('コピーに失敗しました');
            setShowMenu(false);
        });
    };

    const hasRecords = records.length > 0;
    const hasHabits = habits.length > 0;

    return (
        <div className="relative">
            <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm font-medium h-10"
            >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">データ出力</span>
                <ChevronDown className="w-3 h-3" />
            </button>

            {showMenu && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 min-w-[200px] py-1 animate-in fade-in zoom-in-95 duration-150">
                        {showRecords && hasRecords && (
                            <>
                                <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                    診断記録
                                </div>
                                <button
                                    onClick={() => handleCopyRecords(false)}
                                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2.5 transition-colors"
                                >
                                    <FileText className="w-4 h-4 text-teal-500" />
                                    最新の記録
                                </button>
                                <button
                                    onClick={() => handleCopyRecords(true)}
                                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2.5 transition-colors"
                                >
                                    <Table className="w-4 h-4 text-blue-500" />
                                    全記録（{records.length}件）
                                </button>
                            </>
                        )}

                        {showHabits && hasHabits && (
                            <>
                                {showRecords && hasRecords && (
                                    <div className="border-t border-slate-200 dark:border-slate-700 my-1" />
                                )}
                                <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                    習慣記録
                                </div>
                                <button
                                    onClick={() => exportHabitsWeeklyAverage()}
                                    className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2.5 transition-colors"
                                >
                                    <Activity className="w-4 h-4 text-emerald-500" />
                                    週平均サマリー
                                </button>
                            </>
                        )}

                        {!hasRecords && !hasHabits && (
                            <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 text-center">
                                出力するデータがありません
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
