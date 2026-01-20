'use client';

import { useState } from 'react';
import { Copy, ChevronDown, FileText, Table } from 'lucide-react';
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

interface RecordsCopyButtonProps {
    records: RecordData[];
}

export default function RecordsCopyButton({ records }: RecordsCopyButtonProps) {
    const [showMenu, setShowMenu] = useState(false);

    // 詳細ページと同じ形式でフォーマット
    const formatRecordText = (record: RecordData): string => {
        const lines: string[] = [];
        const meta = record.additional_data || {};
        const results = record.data?.results || (Array.isArray(record.data) ? record.data : []);

        // ヘッダー（詳細ページと同じ形式）
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

        // 検査結果（詳細ページと同じ形式）
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

        // セクション（メモ・記録）- 詳細ページと同じ形式
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
        } else {
            // レガシー形式のメモ対応
            if (meta.notes_list && Array.isArray(meta.notes_list)) {
                meta.notes_list.forEach((note: any) => {
                    lines.push(`[${note.title || 'メモ'}]`);
                    if (note.content) {
                        lines.push(note.content);
                    }
                    lines.push('');
                });
            } else if (meta.notes) {
                lines.push(`[メモ]`);
                lines.push(meta.notes);
                lines.push('');
            }

            // 所見
            if (meta.findings) {
                lines.push(`[所見]`);
                lines.push(meta.findings);
                lines.push('');
            }
        }

        return lines.join('\n').trim();
    };

    const handleCopy = (copyAll: boolean) => {
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
            // 最新の記録のみ
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

    return (
        <div className="relative">
            <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
            >
                <Copy className="w-4 h-4" />
                <span className="hidden sm:inline">情報コピー</span>
                <ChevronDown className="w-3 h-3" />
            </button>

            {showMenu && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 min-w-[180px] py-1 animate-in fade-in zoom-in-95 duration-150">
                        <button
                            onClick={() => handleCopy(false)}
                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                        >
                            <FileText className="w-4 h-4 text-teal-500" />
                            最新の記録
                        </button>
                        <button
                            onClick={() => handleCopy(true)}
                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                        >
                            <Table className="w-4 h-4 text-blue-500" />
                            全記録（{records.length}件）
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
