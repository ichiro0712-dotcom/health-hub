'use client';

import { useState } from 'react';
import { updateRecord, deleteRecord } from '../../actions/records';
import { useRouter } from 'next/navigation';
import { Trash2, Edit2, ImageIcon, X, FileText, Calendar, Building, Activity, ChevronRight, Copy, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { showErrorToast } from '@/components/ErrorToast';
import HealthRecordModal from '@/components/HealthRecordModal';
import { HealthRecordData, SectionItem } from '@/components/HealthRecordForm';
import { format } from 'date-fns';

export default function RecordClient({ record, mappings = {} }: { record: any, mappings?: Record<string, string> }) {
    const router = useRouter();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Calculate Age
    const birthDate = record.user?.birthDate ? new Date(record.user.birthDate) : null;
    const recordDate = new Date(record.date);
    let calculatedAge = null;
    if (birthDate) {
        calculatedAge = recordDate.getFullYear() - birthDate.getFullYear();
        const m = recordDate.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && recordDate.getDate() < birthDate.getDate())) {
            calculatedAge--;
        }
    }

    // --- Data Migration / Construction ---
    const meta = record.additional_data as any || {};

    // Check if we already have modern "sections"
    let initialSections: SectionItem[] = [];

    if (meta.sections && Array.isArray(meta.sections)) {
        initialSections = meta.sections.map((s: any) => ({
            ...s,
            id: s.id || Math.random().toString(36),
            images: (s.images || []).map((i: any) => ({ ...i, id: i.id || Math.random().toString(36) }))
        }));
    } else {
        // Legacy Migration
        const legacyNotes = [];
        if (meta.notes_list) {
            legacyNotes.push(...meta.notes_list);
        } else if (meta.notes) {
            legacyNotes.push({ title: 'メモ', content: meta.notes });
        }

        const legacyImages = record.images || [];
        const imageMetadata = meta.image_metadata || {};

        // If we have legacy notes, create sections for them
        if (legacyNotes.length > 0) {
            initialSections = legacyNotes.map((n: any) => ({
                id: Math.random().toString(36),
                title: n.title || '',
                content: n.content || '',
                images: [] // Legacy notes didn't have specific images attached
            }));
        }

        // If we have legacy images, put them in a "Reference Images" section or append to first section
        if (legacyImages.length > 0) {
            const imageItems = legacyImages.map((url: string) => ({
                id: Math.random().toString(36),
                url,
                title: imageMetadata[url] || '',
            }));

            if (initialSections.length > 0) {
                // Append to first section
                initialSections[0].images = [...initialSections[0].images, ...imageItems];
            } else {
                // Create new section
                initialSections.push({
                    id: Math.random().toString(36),
                    title: '参考画像・資料',
                    content: '',
                    images: imageItems
                });
            }
        }

        // If nothing at all, create one empty section
        if (initialSections.length === 0) {
            initialSections.push({ id: Math.random().toString(36), title: '', content: '', images: [] });
        }
    }

    // Fix for normalized data structure
    const rawResults = (record.data as any)?.results || (Array.isArray(record.data) ? record.data : []);

    const initialData: HealthRecordData = {
        id: record.id,
        date: new Date(record.date).toISOString().split('T')[0],
        title: record.title || '',
        hospitalName: meta.hospitalName || '',
        summary: record.summary || '',
        results: rawResults.map((r: any) => {
            const rawItemName = r.item?.trim();
            // Apply Mapping: Raw Name -> Display Name
            const displayName = mappings[rawItemName] || rawItemName;
            return {
                ...r,
                item: displayName, // Store simplified name in initialData for form/display
                id: Math.random().toString(36)
            };
        }),
        sections: initialSections
    };

    const handleUpdate = async (data: any) => {
        const res = await updateRecord(record.id, data);
        if (res.success) {
            toast.success("保存しました");
            router.push('/records');
        }
        return res;
    };

    const handleDeleteRecord = async () => {
        if (confirm('この記録を完全に削除しますか？\n※この操作は取り消せません。')) {
            const res = await deleteRecord(record.id);
            if (res.success) {
                toast.success('削除しました');
                router.push('/');
            } else {
                showErrorToast('削除に失敗しました');
            }
        }
    };

    const handleCopy = () => {
        let text = `＜${format(new Date(initialData.date), 'yyyy/MM/dd')} 診断ファイル詳細＞\n`;
        if (initialData.title) text += `タイトル: ${initialData.title}\n`;
        if (initialData.hospitalName) text += `病院名: ${initialData.hospitalName}\n`;
        if (initialData.summary) text += `要点: ${initialData.summary}\n`;
        text += '\n';

        // Results
        if (initialData.results.length > 0) {
            text += `[検査結果]\n`;
            initialData.results.forEach(res => {
                const evalStr = res.evaluation ? ` (${res.evaluation})` : '';
                const unitStr = res.unit ? ` ${res.unit}` : '';
                text += `${res.item}: ${res.value}${unitStr}${evalStr}\n`;
            });
            text += '\n';
        }

        // Notes/Sections
        initialData.sections.forEach(sec => {
            if (sec.title || sec.content) {
                text += `[${sec.title || 'メモ'}]\n`;
                if (sec.content) text += `${sec.content}\n`;
                text += '\n';
            }
        });

        navigator.clipboard.writeText(text).then(() => {
            toast.success('クリップボードにコピーしました');
        }).catch(() => {
            toast.error('コピーに失敗しました');
        });
    };

    return (
        <div className="space-y-8">
            {/* Sticky Header Section */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 sticky top-0 md:top-16 z-30 -mx-4 md:-mx-6 px-4 md:px-6 py-2">
                <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div onClick={() => router.back()} className="cursor-pointer p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg md:hidden">
                            <ChevronLeft className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <FileText className="w-5 h-5 text-[#00CED1]" />
                                診断ファイル詳細
                            </h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono hidden md:block">
                                ID: {record.id.slice(0, 8)}...
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                        <button
                            onClick={handleCopy}
                            className="text-xs font-bold flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                        >
                            <Copy className="w-3.5 h-3.5" />
                            情報コピー
                        </button>
                        <button
                            onClick={() => setIsEditModalOpen(true)}
                            className="flex items-center justify-center gap-1.5 bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-4 py-1.5 rounded-full text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-200 shadow-sm hover:shadow-md transition-all active:scale-95"
                        >
                            <Edit2 className="w-3.5 h-3.5" />
                            編集
                        </button>
                    </div>
                </div>
            </div>

            {/* Read-Only View of Metadata */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm space-y-4">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#00CED1]" /> 基本情報・要点
                </h3>
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="md:w-auto">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">診断日</label>
                        <div className="flex items-center gap-2 p-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white min-w-[180px]">
                            <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            <span className="font-bold">{format(new Date(initialData.date), 'yyyy/MM/dd')}</span>
                        </div>
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">タイトル</label>
                        <div className="p-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white">
                            <span className="font-bold">{initialData.title || 'なし'}</span>
                        </div>
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">病院名</label>
                        <div className="flex items-center gap-2 p-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white">
                            <Building className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                            <span className="font-bold">{initialData.hospitalName || '未設定'}</span>
                        </div>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">要点</label>
                    <div className="p-3 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-white min-h-[60px] whitespace-pre-wrap leading-relaxed">
                        {initialData.summary || '（要点なし）'}
                    </div>
                </div>
            </div>

            {/* Read-Only Data Table */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm space-y-4">
                <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-[#00CED1]" /> 検査項目 ({initialData.results.length})
                </h3>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="hidden md:table-header-group text-xs text-gray-500 dark:text-gray-400 font-medium border-b border-gray-100 dark:border-slate-700">
                            <tr>
                                <th className="px-2 py-3 w-[30%]">項目名</th>
                                <th className="px-2 py-3 w-[25%]">数値</th>
                                <th className="px-2 py-3 w-[20%]">単位</th>
                                <th className="px-2 py-3 w-[25%]">判定</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                            {initialData.results.map((item, idx) => (
                                <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-slate-700/50 block md:table-row">
                                    <td className="px-2 py-3 font-bold text-gray-900 dark:text-white block md:table-cell" data-label="項目名">{item.item}</td>
                                    <td className="px-2 py-3 font-mono font-medium text-gray-900 dark:text-white text-base block md:table-cell" data-label="数値">
                                        <span className="md:hidden text-gray-400 mr-2">値:</span>{item.value}
                                    </td>
                                    <td className="px-2 py-3 text-gray-500 dark:text-gray-400 text-xs block md:table-cell" data-label="単位">
                                        <span className="md:hidden text-gray-400 mr-2">単位:</span>{item.unit}
                                    </td>
                                    <td className="px-2 py-3 block md:table-cell">
                                        {item.evaluation && (
                                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold ${item.evaluation.includes('异常') || item.evaluation.includes('D') || item.evaluation.includes('E') ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                                                item.evaluation.includes('B') || item.evaluation.includes('C') ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                                                    'bg-teal-50 dark:bg-teal-900/30 text-[#00CED1] dark:text-teal-400'
                                                }`}>
                                                {item.evaluation}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {initialData.results.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400 dark:text-gray-500">データが登録されていません</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Read-Only Sections (Unified) */}
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200 flex items-center gap-2">
                        <FileText className="w-6 h-6 text-[#00CED1]" /> 記録・メモ・画像
                    </h3>
                </div>

                {initialData.sections.map((section) => (
                    (section.title || section.content || section.images.length > 0) && (
                        <div key={section.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm space-y-4">
                            {section.title && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 mb-1">タイトル</label>
                                    <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 pb-1 border-b-2 border-transparent">
                                        {section.title}
                                    </h4>
                                </div>
                            )}

                            {section.content && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 mb-1">内容・メモ</label>
                                    <div className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-lg min-h-[100px] bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed">
                                        {section.content}
                                    </div>
                                </div>
                            )}

                            {section.images.length > 0 && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 mb-2">関連ファイル</label>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {section.images.map((img) => (
                                            <div key={img.id} className="space-y-1 group/img">
                                                <div
                                                    className="aspect-video bg-gray-100 dark:bg-slate-700 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-600 flex items-center justify-center relative cursor-zoom-in hover:border-[#00CED1] transition-colors"
                                                    onClick={() => setSelectedImage(img.url)}
                                                >
                                                    {img.url.toLowerCase().includes('.pdf') ? (
                                                        <iframe
                                                            src={`${img.url}#view=FitH&toolbar=0&navpanes=0&scrollbar=0`}
                                                            className="w-full h-full pointer-events-none"
                                                            title={img.title}
                                                            loading="lazy"
                                                        />
                                                    ) : (
                                                        <img
                                                            src={img.url}
                                                            alt={img.title || 'Image'}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    )}
                                                </div>
                                                {img.title && (
                                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate px-1">{img.title}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                ))}
                {initialData.sections.length === 0 && (
                    <p className="text-center text-gray-400 dark:text-gray-600 py-8">記録・メモはありません</p>
                )}
            </div>


            {/* Delete Button */}
            <div className="flex justify-center pt-8 pb-8">
                <button
                    onClick={handleDeleteRecord}
                    className="text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
                >
                    <Trash2 className="w-4 h-4" />
                    この記録を完全に削除する
                </button>
            </div>

            {/* Modal Components */}
            <HealthRecordModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                initialData={initialData}
                onSubmit={handleUpdate}
            />

            {selectedImage && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSelectedImage(null)}>
                    <div className="relative max-w-5xl max-h-[90vh]">
                        {selectedImage.toLowerCase().includes('.pdf') ? (
                            <iframe src={selectedImage} className="w-[90vw] h-[90vh] rounded-lg" />
                        ) : (
                            <img src={selectedImage} className="max-w-full max-h-[90vh] rounded-lg shadow-2xl" />
                        )}

                        <button className="absolute -top-12 right-0 md:top-4 md:right-4 bg-white/20 hover:bg-white/40 p-2 rounded-full text-white transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
