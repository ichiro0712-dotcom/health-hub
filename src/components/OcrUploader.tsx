'use client';

import { useState } from 'react';
import { processHealthCheckDocuments } from '@/app/actions/ocr';
import { saveHealthRecord } from '@/app/actions/health-record';
import { Upload, CheckCircle, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { OcrResponse, OcrItem } from '@/types/ocr';
import toast from 'react-hot-toast';
import { showErrorToast } from './ErrorToast';

import { uploadImage } from '@/app/actions/upload';

export default function OcrUploader({ initialAge, onSaveOverride, isUpdateMode, onImport }: { initialAge?: number, onSaveOverride?: (data: any) => Promise<any>, isUpdateMode?: boolean, onImport?: (data: OcrResponse, images: string[]) => void }) {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [ocrResult, setOcrResult] = useState<OcrResponse | null>(null);
    const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
    const [isDragging, setIsDragging] = useState(false);

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const onDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleFiles(Array.from(files));
        }
    }

    const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(Array.from(e.target.files));
        }
    }

    async function handleFiles(files: File[]) {
        setIsUploading(true);
        setOcrResult(null);
        setUploadProgress(0);

        try {
            // 1. Upload to Supabase Storage via Server Action
            const urls: string[] = [];
            let completed = 0;

            for (const file of files) {
                const formData = new FormData();
                formData.append('file', file);

                const uploadRes = await uploadImage(formData);

                if (!uploadRes.success || !uploadRes.url) {
                    throw new Error(uploadRes.error || "Upload failed");
                }

                urls.push(uploadRes.url);
                completed++;
                setUploadProgress(Math.round((completed / files.length) * 50)); // First 50% is upload
            }

            setUploadedImageUrls(urls);

            // 2. Call Server Action with URLs
            const result = await processHealthCheckDocuments(urls);
            setUploadProgress(100);

            if (result.success) {
                if (onImport) {
                    onImport(result.data, urls);
                    toast.success(`解析完了 (${files.length}枚)`);
                    // Reset or keep uploading state? Usually we want to finish.
                    setOcrResult(null); // Clear result just in case
                } else {
                    setOcrResult(result.data);
                    toast.success(`OCR解析完了 (${files.length}枚)`);
                }
            } else {
                showErrorToast("OCR失敗: " + result.error);
            }

        } catch (e: any) {
            console.error(e);
            showErrorToast("アップロード失敗: " + (e.message || "不明なエラー"));
        } finally {
            setIsUploading(false);
        }
    }

    return (
        <div>
            {!ocrResult ? (
                <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition duration-200 ease-in-out ${isDragging
                        ? 'border-[#00CED1] bg-[#00CED1]/10 bg-opacity-10 scale-[1.02]'
                        : 'border-gray-300 hover:bg-gray-50'
                        }`}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                >
                    <input
                        type="file"
                        multiple
                        accept="image/*,application/pdf"
                        className="hidden"
                        id="file-upload"
                        onChange={onFileSelect}
                    />
                    <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                        <div className={`p-4 rounded-full mb-3 transition-colors ${isDragging ? 'bg-[#00CED1]/20' : 'bg-gray-100'}`}>
                            <Upload className={`w-8 h-8 ${isDragging ? 'text-[#00CED1]' : 'text-gray-400'}`} />
                        </div>
                        <span className={`font-semibold text-lg mb-1 ${isDragging ? 'text-[#00CED1]' : 'text-gray-700'}`}>
                            {isDragging ? 'ここにファイルをドロップ' : 'クリックして健康診断書をアップロード'}
                        </span>
                        <span className="text-sm text-gray-500">
                            (対応形式: 画像, PDF / 複数ファイル対応)
                        </span>
                    </label>
                    {isUploading && (
                        <div className="mt-4">
                            <p className="text-[#00CED1] font-medium animate-pulse mb-2">
                                解析中... {uploadProgress < 50 ? '画像をアップロードしています' : 'AIがデータを読み取っています'}
                            </p>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div className="bg-[#00CED1] h-2.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <VerificationUI
                    result={ocrResult}
                    images={uploadedImageUrls}
                    onReset={() => setOcrResult(null)}
                    initialAge={initialAge}
                    onSaveOverride={onSaveOverride}
                    isUpdateMode={isUpdateMode}
                />
            )}
        </div>
    );
}

function VerificationUI({ result, images, onReset, initialAge, onSaveOverride, isUpdateMode }: { result: OcrResponse, images: string[], onReset: () => void, initialAge?: number, onSaveOverride?: (data: any) => Promise<any>, isUpdateMode?: boolean }) {
    const [data, setData] = useState<OcrResponse>(() => {
        // If age is provided in props but missing in OCR result, auto-fill it
        if (initialAge && !result.meta?.age) {
            return {
                ...result,
                meta: {
                    ...result.meta,
                    age: initialAge
                }
            };
        }
        return result;
    });

    async function handleSave() {
        let res;
        if (onSaveOverride) {
            // Use override if provided
            const payload = { ...data, images };
            res = await onSaveOverride(payload);
        } else {
            // Default behavior - pass data with images
            res = await saveHealthRecord({ ...data, images } as Parameters<typeof saveHealthRecord>[0]);
        }

        if (res.success) {
            toast.success(isUpdateMode ? "記録に追加しました！" : "健康データが保存されました！");
            onReset();
        } else {
            showErrorToast("保存失敗: " + res.error);
        }
    }

    const handleChange = (idx: number, field: keyof OcrItem, val: string) => {
        const newData = { ...data };
        const item = newData.results[idx];
        if (field === 'value') {
            item.value = val;
        } else if (field === 'item') {
            item.item = val;
        } else if (field === 'unit') {
            item.unit = val;
        } else if (field === 'evaluation') {
            item.evaluation = val;
        } else if (field === 'category') {
            item.category = val;
        }
        setData(newData);
    }

    const handleAddRow = () => {
        const newData = { ...data };
        newData.results.push({
            item: "",
            value: "",
            unit: "",
            category: "Other",
            isAbnormal: false,
            evaluation: ""
        });
        setData(newData);
    }

    const handleDeleteRow = (idx: number) => {
        const newData = { ...data };
        newData.results.splice(idx, 1);
        setData(newData);
    }

    return (
        <div className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="font-bold text-xl text-gray-800 dark:text-gray-200 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-[#00CED1]" />
                        結果の確認
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">解析結果に誤りがないか確認・修正してください。</p>
                </div>
                <button type="button" onClick={onReset} className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline">
                    キャンセルして再試行
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
                {/* Preview Section */}
                <div className="p-4 bg-gray-50/50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700">
                    <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                        アップロードされたファイル ({images.length})
                    </h4>
                    <div className="grid grid-cols-1 gap-4">
                        {images.map((url, idx) => (
                            <div key={idx} className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800">
                                {url.toLowerCase().includes('.pdf') ? (
                                    <iframe src={`${url}#view=FitH`} className="w-full h-[500px]" title={`PDF Preview ${idx + 1}`} />
                                ) : (
                                    <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-auto max-h-[600px] object-contain" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Meta Header */}
                <div className="bg-gray-50/50 dark:bg-slate-700/50 p-4 border-b border-gray-100 dark:border-slate-700 grid grid-cols-12 gap-4">
                    <div className="col-span-4">
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">検査日</span>
                        <input
                            type="date"
                            value={data.date || ""}
                            onChange={(e) => setData({ ...data, date: e.target.value })}
                            className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded px-3 py-2 text-sm font-bold text-gray-900 dark:text-white focus:border-[#00CED1] outline-none shadow-sm"
                        />
                    </div>
                    <div className="col-span-6">
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">病院名</span>
                        <input
                            type="text"
                            value={data.meta?.hospitalName || ""}
                            onChange={(e) => setData({ ...data, meta: { ...data.meta, hospitalName: e.target.value } })}
                            placeholder="病院名を入力"
                            className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded px-3 py-2 text-sm font-bold text-gray-900 dark:text-white focus:border-[#00CED1] outline-none shadow-sm placeholder:text-gray-400 dark:placeholder:text-slate-500"
                        />
                    </div>
                    <div className="col-span-2">
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">年齢</span>
                        <input
                            type="number"
                            value={data.meta?.age || ""}
                            onChange={(e) => setData({ ...data, meta: { ...data.meta, age: e.target.value } })}
                            placeholder="年齢"
                            className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded px-3 py-2 text-sm font-bold text-gray-900 dark:text-white focus:border-[#00CED1] outline-none shadow-sm placeholder:text-gray-400 dark:placeholder:text-slate-500"
                        />
                    </div>
                </div>

                {/* Data Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-slate-700 text-xs text-gray-500 dark:text-gray-300 uppercase font-semibold">
                            <tr>
                                <th className="py-3 px-4 w-1/3">項目</th>
                                <th className="py-3 px-4 w-1/6">値</th>
                                <th className="py-3 px-4 w-1/6">単位</th>
                                <th className="py-3 px-4 w-1/6">評価</th>
                                <th className="py-3 px-4 text-center w-1/6">状態</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                            {data.results?.map((item: OcrItem, idx: number) => (
                                <tr key={idx} className="hover:bg-[#f0fdfc] dark:hover:bg-slate-700/50 transition-colors group">
                                    <td className="py-3 px-4 font-medium text-gray-900 dark:text-gray-100">
                                        <input
                                            type="text"
                                            value={item.item}
                                            onChange={(e) => handleChange(idx, 'item', e.target.value)}
                                            className="w-full bg-transparent border-b border-transparent focus:bg-white dark:focus:bg-slate-900 focus:border-[#00CED1] hover:border-gray-300 dark:hover:border-slate-600 outline-none transition-all px-1 font-bold text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder:text-slate-500"
                                            placeholder="項目名"
                                        />
                                    </td>
                                    <td className="py-3 px-4">
                                        <input
                                            type="text"
                                            value={item.value}
                                            onChange={(e) => handleChange(idx, 'value', e.target.value)}
                                            className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 focus:bg-white dark:focus:bg-slate-900 focus:border-[#00CED1] hover:border-gray-300 dark:hover:border-slate-500 rounded px-2 py-1 transition-all outline-none font-bold text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder:text-slate-500"
                                            placeholder="値"
                                        />
                                    </td>
                                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400 text-xs">
                                        <input
                                            type="text"
                                            value={item.unit || ''}
                                            onChange={(e) => handleChange(idx, 'unit', e.target.value)}
                                            className="w-16 bg-transparent border-b border-transparent focus:bg-white dark:focus:bg-slate-900 focus:border-[#00CED1] hover:border-gray-300 dark:hover:border-slate-600 outline-none transition-all px-1 font-medium text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder:text-slate-500"
                                            placeholder="単位"
                                        />
                                    </td>
                                    <td className="py-3 px-4">
                                        <input
                                            type="text"
                                            value={item.evaluation || ''}
                                            onChange={(e) => handleChange(idx, 'evaluation', e.target.value)}
                                            className="w-12 bg-transparent border-b border-transparent focus:bg-white dark:focus:bg-slate-900 focus:border-[#00CED1] hover:border-gray-300 dark:hover:border-slate-600 outline-none transition-all px-1 font-medium text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder:text-slate-500 text-center"
                                            placeholder="判定"
                                        />
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            {item.isAbnormal ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded text-xs font-medium whitespace-nowrap">
                                                    <AlertTriangle className="w-3 h-3" /> 要注意
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded text-xs font-medium whitespace-nowrap">
                                                    <CheckCircle className="w-3 h-3" /> 正常
                                                </span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteRow(idx)}
                                                className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition"
                                                title="削除"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={4} className="p-3 bg-gray-50/50 dark:bg-slate-700/50 text-center">
                                    <button
                                        type="button"
                                        onClick={handleAddRow}
                                        className="inline-flex items-center gap-2 text-sm text-[#00CED1] hover:text-[#00acc1] font-medium px-4 py-2 hover:bg-[#00CED1]/10 rounded-lg transition"
                                    >
                                        <Plus className="w-4 h-4" /> 行を追加する
                                    </button>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Notes */}
                <div className="p-4 bg-gray-50/30 dark:bg-slate-700/30 border-t border-gray-100 dark:border-slate-700">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-2">補足事項・所見</span>
                    <textarea
                        value={data.meta?.notes || ""}
                        onChange={(e) => setData({ ...data, meta: { ...data.meta, notes: e.target.value } })}
                        placeholder="医師からのコメントや特記事項があれば入力してください"
                        className="w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-100 focus:border-[#00CED1] outline-none shadow-sm min-h-[80px] placeholder:text-gray-400 dark:placeholder:text-slate-500"
                    />
                </div>

                {/* Actions */}
                <div className="p-4 bg-gray-50/50 dark:bg-slate-700/50 border-t border-gray-100 dark:border-slate-700 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onReset}
                        className="px-5 py-2.5 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition"
                    >
                        キャンセル
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="px-5 py-2.5 bg-[#00CED1] text-white font-medium rounded-lg hover:bg-[#00acc1] shadow-sm hover:shadow transition flex items-center gap-2"
                    >
                        <CheckCircle className="w-4 h-4" />
                        保存する
                    </button>
                </div>
            </div>
        </div>
    )
}
