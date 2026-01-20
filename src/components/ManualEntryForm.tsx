'use client';

import { useState } from 'react';
import { Plus, Trash2, Save, Calendar, Building, FileText, Upload, Sparkles } from 'lucide-react';
import { saveHealthRecord } from '@/app/actions/health-record';
import toast from 'react-hot-toast';
import { uploadImage } from '@/app/actions/upload';
import { showErrorToast } from './ErrorToast';
import { parseHealthCheckText } from '@/app/actions/ocr';

interface ManualEntryFormProps {
    onSuccess: () => void;
    onSaveOverride?: (data: any) => Promise<any>;
    isUpdateMode?: boolean;
}

interface HealthItem {
    id: string;
    item: string;
    value: string;
    unit: string;
    evaluation: string;
}

export default function ManualEntryForm({ onSuccess, onSaveOverride, isUpdateMode }: ManualEntryFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [rawText, setRawText] = useState('');
    const [isParsing, setIsParsing] = useState(false);

    // Basic Info
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [hospitalName, setHospitalName] = useState('');
    const [age, setAge] = useState<string>('');
    const [notes, setNotes] = useState('');

    // Items
    const [items, setItems] = useState<HealthItem[]>([
        { id: '1', item: '', value: '', unit: '', evaluation: '' }
    ]);

    // Images
    const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    const handleParseText = async () => {
        if (!rawText.trim()) return;
        setIsParsing(true);
        try {
            const res = await parseHealthCheckText(rawText);
            if (res.success && res.data) {
                const d = res.data;
                if (d.date) setDate(d.date);
                if (d.meta?.hospitalName) setHospitalName(d.meta.hospitalName);
                if (d.meta?.age) setAge(d.meta.age.toString());
                if (d.meta?.notes) setNotes(prev => (prev ? prev + "\n" + d.meta.notes : d.meta.notes));

                if (d.results && Array.isArray(d.results)) {
                    const newItems = d.results.map((r: any) => ({
                        id: Math.random().toString(36),
                        item: r.item || '',
                        value: r.value !== null ? String(r.value) : '',
                        unit: r.unit || '',
                        evaluation: r.evaluation || ''
                    }));

                    // If current list has only one empty item, replace it. Otherwise append.
                    if (items.length === 1 && items[0].item === '' && items[0].value === '') {
                        setItems(newItems);
                    } else {
                        setItems([...items, ...newItems]);
                    }
                }
                toast.success('テキストを解析し、フォームに入力しました');
                setRawText(''); // Clear text after success
            } else {
                showErrorToast(res.error || "解析に失敗しました");
            }
        } catch (e) {
            console.error(e);
            showErrorToast("解析中にエラーが発生しました");
        } finally {
            setIsParsing(false);
        }
    };

    const addItem = () => {
        setItems([...items, { id: Math.random().toString(36), item: '', value: '', unit: '', evaluation: '' }]);
    };

    const removeItem = (id: string) => {
        setItems(items.filter(i => i.id !== id));
    };

    const updateItem = (id: string, field: keyof HealthItem, val: string) => {
        setItems(items.map(i => i.id === id ? { ...i, [field]: val } : i));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        try {
            const newUrls: string[] = [];
            for (const file of Array.from(files)) {
                const formData = new FormData();
                formData.append('file', file);
                const res = await uploadImage(formData);
                if (res.success && res.url) {
                    newUrls.push(res.url);
                } else {
                    console.error(res.error);
                    showErrorToast("画像アップロード失敗: " + res.error);
                }
            }
            setUploadedImageUrls(prev => [...prev, ...newUrls]);
            toast.success(`${newUrls.length}枚の画像をアップロードしました`);
        } catch (error) {
            console.error(error);
            showErrorToast("アップロード処理に失敗しました");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        const formattedResults = items
            .filter(i => i.item.trim() !== '') // non-empty names
            .map(i => ({
                item: i.item,
                value: i.value ? parseFloat(i.value) : null,
                unit: i.unit,
                evaluation: i.evaluation,
                category: 'Manual'
            }));

        const payload = {
            date,
            results: formattedResults,
            meta: {
                hospitalName,
                age: age ? parseInt(age) : null,
                notes
            },
            images: uploadedImageUrls
        };

        let res;
        if (onSaveOverride) {
            res = await onSaveOverride(payload);
        } else {
            res = await saveHealthRecord(payload);
        }

        if (res.success) {
            toast.success(isUpdateMode ? '記録に追加しました' : '健康診断データを保存しました');
            onSuccess();
            // Reset form
            setHospitalName('');
            setNotes('');
            setItems([{ id: '1', item: '', value: '', unit: '', evaluation: '' }]);
            setUploadedImageUrls([]);
            setRawText('');
        } else {
            showErrorToast("保存に失敗しました: " + res.error);
        }
        setIsSubmitting(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {/* Text Parsing Section */}
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    テキストから自動入力
                </h3>
                <p className="text-sm text-gray-500">
                    健康診断の結果テキスト（メールやPDFのコピー）を貼り付けると、AIが自動で項目を抽出して入力します。
                </p>
                <textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="ここにテキストを貼り付けてください..."
                    className="w-full p-3 border border-gray-200 rounded-lg min-h-[120px] focus:ring-2 focus:ring-[#00CED1]/20 focus:border-[#00CED1] outline-none text-sm font-mono text-gray-900"
                />
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={handleParseText}
                        disabled={isParsing || !rawText.trim()}
                        className="bg-amber-400 text-white px-5 py-2 rounded-lg font-bold hover:bg-amber-500 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                        {isParsing ? '解析中...' : 'AIで解析して入力'}
                        {!isParsing && <Sparkles className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Basic Info - Only show for new records */}
            {!isUpdateMode && (
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-[#00CED1]" /> 基本情報
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">診断日</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                <input
                                    type="date"
                                    required={!isUpdateMode}
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    className="pl-10 w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#00CED1]/20 focus:border-[#00CED1] outline-none text-gray-900"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">病院・クリニック名</label>
                            <div className="relative">
                                <Building className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="例: 新宿トミヒサクリニック"
                                    value={hospitalName}
                                    onChange={e => setHospitalName(e.target.value)}
                                    className="pl-10 w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#00CED1]/20 focus:border-[#00CED1] outline-none text-gray-900"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">受診時年齢</label>
                            <input
                                type="number"
                                placeholder="歳"
                                value={age}
                                onChange={e => setAge(e.target.value)}
                                className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#00CED1]/20 focus:border-[#00CED1] outline-none text-gray-900"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Items */}
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-[#00CED1]" /> 検査項目
                </h3>
                <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-2 text-sm text-gray-500 font-medium px-2">
                        <div className="col-span-4">項目名</div>
                        <div className="col-span-3">数値</div>
                        <div className="col-span-2">単位</div>
                        <div className="col-span-2">判定/評価</div>
                        <div className="col-span-1"></div>
                    </div>
                    {items.map((item) => (
                        <div key={item.id} className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-2 rounded-lg">
                            <div className="col-span-4">
                                <input
                                    type="text"
                                    placeholder="項目 (例: γ-GTP)"
                                    value={item.item}
                                    onChange={e => updateItem(item.id, 'item', e.target.value)}
                                    className="w-full bg-transparent border-none focus:ring-0 p-1 font-medium placeholder-gray-400 text-gray-900"
                                />
                            </div>
                            <div className="col-span-3">
                                <input
                                    type="number"
                                    placeholder="0"
                                    value={item.value}
                                    onChange={e => updateItem(item.id, 'value', e.target.value)}
                                    className="w-full bg-transparent border-none focus:ring-0 p-1 font-mono placeholder-gray-400 text-gray-900"
                                />
                            </div>
                            <div className="col-span-2">
                                <input
                                    type="text"
                                    placeholder="単位"
                                    value={item.unit}
                                    onChange={e => updateItem(item.id, 'unit', e.target.value)}
                                    className="w-full bg-transparent border-none focus:ring-0 p-1 text-sm text-gray-900 placeholder-gray-300"
                                />
                            </div>
                            <div className="col-span-2">
                                <input
                                    type="text"
                                    placeholder="A,B..."
                                    value={item.evaluation}
                                    onChange={e => updateItem(item.id, 'evaluation', e.target.value)}
                                    className="w-full bg-transparent border-none focus:ring-0 p-1 text-center font-medium text-gray-900"
                                />
                            </div>
                            <div className="col-span-1 text-right">
                                <button type="button" onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                <button
                    type="button"
                    onClick={addItem}
                    className="w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 hover:border-[#00CED1] hover:text-[#00CED1] hover:bg-[#00CED1]/5 transition-all text-sm font-medium items-center justify-center flex gap-1"
                >
                    <Plus className="w-4 h-4" /> 行を追加
                </button>
            </div>

            {/* Notes & Images */}
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm space-y-4">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-[#00CED1]" /> メモ・画像
                </h3>

                <textarea
                    placeholder="医師からのコメントやメモがあれば入力してください..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-lg h-24 focus:ring-2 focus:ring-[#00CED1]/20 focus:border-[#00CED1] outline-none resize-none text-gray-900"
                />

                <div>
                    <input
                        type="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        id="manual-image-upload"
                        onChange={handleImageUpload}
                    />
                    <label
                        htmlFor="manual-image-upload"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors text-sm font-medium"
                    >
                        <Upload className="w-4 h-4" />
                        {isUploading ? 'アップロード中...' : '参考画像を添付 (複数可)'}
                    </label>
                    {uploadedImageUrls.length > 0 && (
                        <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
                            {uploadedImageUrls.map((url, idx) => (
                                <img key={idx} src={url} alt="Attached" className="h-20 w-20 object-cover rounded-lg border border-gray-200" />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-gray-900 text-white px-8 py-3 rounded-full hover:bg-gray-800 transition-shadow shadow-lg hover:shadow-xl font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <Save className="w-5 h-5" />
                    )}
                    データを保存
                </button>
            </div>
        </form>
    );
}
