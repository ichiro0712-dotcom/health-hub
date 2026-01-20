import { useState } from 'react';
import { X, FileText, Upload, PenTool, Loader2 } from 'lucide-react';
import { processHealthCheckDocuments, parseHealthCheckText } from '@/app/actions/ocr';
import { HealthItem } from './HealthRecordForm';
import { uploadImage } from '@/app/actions/upload';
import toast from 'react-hot-toast';

interface DataImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (items: HealthItem[]) => void;
}

export default function DataImportModal({ isOpen, onClose, onImport }: DataImportModalProps) {
    const [activeTab, setActiveTab] = useState<'ocr' | 'text'>('ocr');
    const [isProcessing, setIsProcessing] = useState(false);

    // OCR State
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

    // Text State
    const [textInput, setTextInput] = useState('');

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setSelectedFiles(Array.from(e.target.files));
        }
    };

    const handleOcrImport = async () => {
        if (selectedFiles.length === 0) return;
        setIsProcessing(true);

        try {
            // 1. Upload Images
            const imageUrls: string[] = [];
            for (const file of selectedFiles) {
                const formData = new FormData();
                formData.append('file', file);
                const res = await uploadImage(formData);
                if (res.success && res.url) {
                    imageUrls.push(res.url);
                } else {
                    throw new Error('Image upload failed');
                }
            }

            // 2. Process with OCR
            const result = await processHealthCheckDocuments(imageUrls);
            if (result.success && result.data && result.data.results) {
                const items: HealthItem[] = result.data.results.map((r: any) => ({
                    id: Math.random().toString(36),
                    item: r.item,
                    value: r.value?.toString(),
                    unit: r.unit,
                    evaluation: r.evaluation,
                    isAbnormal: r.isAbnormal
                }));
                onImport(items);
                onClose();
                toast.success('データを読み込みました');
            } else {
                toast.error('データの読み取りに失敗しました');
            }
        } catch (error) {
            console.error(error);
            toast.error('エラーが発生しました');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleTextImport = async () => {
        if (!textInput.trim()) return;
        setIsProcessing(true);

        try {
            const result = await parseHealthCheckText(textInput);
            if (result.success && result.data && result.data.results) {
                const items: HealthItem[] = result.data.results.map((r: any) => ({
                    id: Math.random().toString(36),
                    item: r.item,
                    value: r.value?.toString(),
                    unit: r.unit,
                    evaluation: r.evaluation,
                    isAbnormal: r.isAbnormal
                }));
                onImport(items);
                onClose();
                toast.success('テキストを解析しました');
            } else {
                toast.error('テキストの解析に失敗しました');
            }
        } catch (error) {
            console.error(error);
            toast.error('エラーが発生しました');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <Upload className="w-5 h-5 text-[#00CED1]" />
                        データをインポート
                    </h2>
                    <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 dark:border-slate-700">
                    <button
                        type="button"
                        onClick={() => setActiveTab('ocr')}
                        className={`flex-1 py-4 text-center font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'ocr'
                            ? 'text-[#00CED1] border-b-2 border-[#00CED1] bg-[#F0FBFC] dark:bg-teal-900/20'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        <FileText className="w-4 h-4" />
                        画像から読み取り (OCR)
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('text')}
                        className={`flex-1 py-4 text-center font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === 'text'
                            ? 'text-[#00CED1] border-b-2 border-[#00CED1] bg-[#F0FBFC] dark:bg-teal-900/20'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        <PenTool className="w-4 h-4" />
                        テキスト解析
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 bg-white dark:bg-slate-800">
                    {activeTab === 'ocr' ? (
                        <div className="space-y-6">
                            <div className="border-2 border-dashed border-gray-200 dark:border-slate-600 rounded-xl p-8 text-center hover:border-[#00CED1] hover:bg-[#F0FBFC] dark:hover:bg-slate-700 transition-colors cursor-pointer relative">
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="flex flex-col items-center gap-2 text-gray-500 dark:text-gray-400">
                                    <Upload className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                                    <p className="font-bold text-gray-700 dark:text-gray-300">画像をアップロード</p>
                                    <p className="text-sm">クリックまたはドラッグ＆ドロップ</p>
                                </div>
                            </div>
                            {selectedFiles.length > 0 && (
                                <div>
                                    <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">選択されたファイル:</p>
                                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                        {selectedFiles.map((f, i) => (
                                            <li key={i} className="flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-gray-400" />
                                                {f.name}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={handleOcrImport}
                                disabled={selectedFiles.length === 0 || isProcessing}
                                className="w-full bg-[#00CED1] text-white font-bold py-3 rounded-xl hover:bg-[#00B8BA] disabled:opacity-50 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                            >
                                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                                {isProcessing ? '解析中...' : '画像を解析して追加'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">テキストを入力</label>
                                <textarea
                                    value={textInput}
                                    onChange={e => setTextInput(e.target.value)}
                                    placeholder="診断結果のテキストをここに貼り付けてください..."
                                    className="w-full h-48 p-4 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-[#00CED1]/20 focus:border-[#00CED1] outline-none resize-none text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-900 placeholder:text-gray-400 dark:placeholder:text-slate-500"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleTextImport}
                                disabled={!textInput.trim() || isProcessing}
                                className="w-full bg-[#00CED1] text-white font-bold py-3 rounded-xl hover:bg-[#00B8BA] disabled:opacity-50 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                            >
                                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <PenTool className="w-5 h-5" />}
                                {isProcessing ? '解析中...' : 'テキストを解析して追加'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
