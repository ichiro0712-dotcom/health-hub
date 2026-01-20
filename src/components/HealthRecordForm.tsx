'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Calendar, Building, FileText, Upload, Sparkles, X, Image as ImageIcon, ChevronUp, ChevronDown, Edit2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadImage } from '@/app/actions/upload';
import { showErrorToast } from './ErrorToast';
import DataImportModal from './DataImportModal';
import { parseHealthCheckText } from '@/app/actions/ocr';
import OcrUploader from './OcrUploader';


export interface HealthRecordData {
    id?: string;
    date: string;
    title?: string;
    hospitalName?: string;
    summary?: string; // Added summary field
    // age?: number; // Calculated automatically
    results: HealthItem[];
    // Unified Section Structure
    sections: SectionItem[];
}

// Simple Modal Component (Internal)
function Modal({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string, children: React.ReactNode }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        {title}
                    </h2>
                    <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto flex-1 bg-white dark:bg-slate-800">
                    {children}
                </div>
            </div>
        </div>
    );
}


export interface HealthItem {
    id: string; // Internal UI ID or undefined if new
    item: string;
    value: string;
    unit: string;
    evaluation: string;
    category?: string;
}

export interface SectionItem {
    id: string;
    title: string;
    content: string;
    images: ImageItem[];
}

export interface ImageItem {
    id: string;
    url: string;
    title: string; // Image specific caption/title if needed, or we can rely on section title? User asked for "Title, Note, Image as one set".
    // But "Title・Memo・Image で１つ。それを複数追加できる" -> Maybe one image per section? Or multiple images?
    // "画像は画像でタイトルありでついかになっている" -> "Image *was* separate with title..."
    // "Title, Note, Image as a bundle". Usually this implies multiple images per section is fine.
    // Let's keep ImageItem having a title just in case, or maybe just simple images in the section.
    // Let's keep detailed image structure but nested in section.
    file?: File;
}

interface HealthRecordFormProps {
    initialData?: HealthRecordData;
    onSubmit: (data: any) => Promise<{ success: boolean; error?: string }>;
    onCancel?: () => void;
    isModal?: boolean;
    hideBasicInfo?: boolean;
}

export default function HealthRecordForm({ initialData, onSubmit, onCancel, isModal = false, hideBasicInfo = false }: HealthRecordFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    // Parsing State
    const [rawText, setRawText] = useState('');
    const [isParsing, setIsParsing] = useState(false);
    const [isOcrUploadOpen, setIsOcrUploadOpen] = useState(false);

    // Form State
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [title, setTitle] = useState('');
    const [hospitalName, setHospitalName] = useState('');
    const [summary, setSummary] = useState('');
    // const [age, setAge] = useState<string>('');

    const [items, setItems] = useState<HealthItem[]>([
        { id: '1', item: '', value: '', unit: '', evaluation: '' }
    ]);

    const [sections, setSections] = useState<SectionItem[]>([
        { id: '1', title: '', content: '', images: [] }
    ]);

    // Drag State per section
    const [dragActiveSectionId, setDragActiveSectionId] = useState<string | null>(null);

    // Initialize from props
    useEffect(() => {
        if (initialData) {
            setDate(initialData.date);
            setTitle(initialData.title || '');
            setHospitalName(initialData.hospitalName || '');
            setSummary(initialData.summary || '');
            // setAge(initialData.age ? String(initialData.age) : '');

            if (initialData.results && initialData.results.length > 0) {
                setItems(initialData.results.map(r => ({ ...r, id: r.id || Math.random().toString(36) })));
            }

            if (initialData.sections && initialData.sections.length > 0) {
                setSections(initialData.sections.map(s => ({
                    ...s,
                    id: s.id || Math.random().toString(36),
                    images: s.images.map(i => ({ ...i, id: i.id || Math.random().toString(36) }))
                })));
            }
        }
    }, [initialData]);


    // --- Parsign Logic ---
    const handleParseText = async () => {
        if (!rawText.trim()) return;
        setIsParsing(true);
        try {
            const res = await parseHealthCheckText(rawText);
            if (res.success && res.data) {
                const d = res.data;
                if (d.date) setDate(d.date);
                if (d.meta?.hospitalName) setHospitalName(d.meta.hospitalName);
                // if (d.meta?.age) setAge(d.meta.age.toString());

                // Merge parsed notes into the first section if empty, or new section
                if (d.meta?.notes) {
                    if (sections.length === 1 && sections[0].content === '' && sections[0].title === '') {
                        setSections([{ ...sections[0], title: 'AI解析メモ', content: d.meta.notes }]);
                    } else {
                        setSections([...sections, { id: Math.random().toString(36), title: 'AI解析メモ', content: d.meta.notes, images: [] }]);
                    }
                }

                if (d.results && Array.isArray(d.results)) {
                    const newItems = d.results.map((r: any) => ({
                        id: Math.random().toString(36),
                        item: r.item || '',
                        value: r.value !== null ? String(r.value) : '',
                        unit: r.unit || '',
                        evaluation: r.evaluation || ''
                    }));

                    if (items.length === 1 && items[0].item === '' && items[0].value === '') {
                        setItems(newItems);
                    } else {
                        setItems([...items, ...newItems]);
                    }
                }
                toast.success('テキストを解析しました');
                setRawText('');
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


    // --- OCR Import Logic ---
    const handleOcrImport = (data: any, images: string[]) => {
        // Merge Basic Info
        if (data.date) setDate(data.date);
        if (data.meta?.hospitalName) setHospitalName(data.meta.hospitalName);
        if (data.meta?.title) setTitle(data.meta.title);

        // Merge Items
        if (data.results && Array.isArray(data.results)) {
            const newItems = data.results.map((r: any) => ({
                id: Math.random().toString(36),
                item: r.item || '',
                value: r.value !== null ? String(r.value) : '',
                unit: r.unit || '',
                evaluation: r.evaluation || ''
            }));

            if (items.length === 1 && items[0].item === '' && items[0].value === '') {
                setItems(newItems);
            } else {
                setItems([...items, ...newItems]);
            }
        }

        // Merge Notes to Sections
        if (data.meta?.notes) {
            if (sections.length === 1 && sections[0].content === '' && sections[0].title === '') {
                setSections([{ ...sections[0], title: '診断書メモ', content: data.meta.notes }]);
            } else {
                setSections([...sections, { id: Math.random().toString(36), title: '診断書メモ', content: data.meta.notes, images: [] }]);
            }
        }

        // Add Images to a new section "診断書画像"
        if (images && images.length > 0) {
            const imageObjs = images.map(url => ({
                id: Math.random().toString(36),
                url: url,
                title: '診断書画像',
            }));

            // Check if we have an empty section to put in, or create new
            // We'll create a new section specifically for these images
            setSections(prev => [
                ...prev,
                {
                    id: Math.random().toString(36),
                    title: '診断書原本',
                    content: 'OCR読み取りに使用した画像です。',
                    images: imageObjs
                }
            ]);
        }

        setIsOcrUploadOpen(false);
        toast.success('OCRデータを読み込みました');
    };


    // --- Section Logic ---
    const addSection = () => {
        setSections([...sections, { id: Math.random().toString(36), title: '', content: '', images: [] }]);
    };
    const removeSection = (id: string) => {
        setSections(sections.filter(s => s.id !== id));
    };
    const updateSection = (id: string, field: keyof SectionItem, val: string) => {
        setSections(sections.map(s => s.id === id ? { ...s, [field]: val } : s));
    };

    const moveSection = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === sections.length - 1) return;

        const newSections = [...sections];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        [newSections[index], newSections[targetIndex]] = [newSections[targetIndex], newSections[index]];
        setSections(newSections);
    };

    // --- Section Image Logic ---
    const handleDrag = (e: React.DragEvent, sectionId: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActiveSectionId(sectionId);
        } else if (e.type === "dragleave") {
            // Only verify if we are leaving the dropzone itself, but simpler to just set false if leaving
            setDragActiveSectionId(null);
        }
    };

    const handleDrop = (e: React.DragEvent, sectionId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActiveSectionId(null);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFiles(Array.from(e.dataTransfer.files), sectionId);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, sectionId: string) => {
        if (e.target.files && e.target.files[0]) {
            processFiles(Array.from(e.target.files), sectionId);
        }
    };

    const processFiles = (files: File[], sectionId: string) => {
        const newImages = files.map(file => ({
            id: Math.random().toString(36),
            url: URL.createObjectURL(file),
            title: file.name.split('.')[0],
            file: file
        }));

        setSections(sections.map(s => {
            if (s.id === sectionId) {
                return { ...s, images: [...s.images, ...newImages] };
            }
            return s;
        }));
    };

    const removeImageFromSection = (sectionId: string, imageId: string) => {
        setSections(sections.map(s => {
            if (s.id === sectionId) {
                return { ...s, images: s.images.filter(img => img.id !== imageId) };
            }
            return s;
        }));
    };

    const updateImageTitleInSection = (sectionId: string, imageId: string, title: string) => {
        setSections(sections.map(s => {
            if (s.id === sectionId) {
                return {
                    ...s,
                    images: s.images.map(img => img.id === imageId ? { ...img, title } : img)
                };
            }
            return s;
        }));
    };

    // --- Items Logic ---
    const addItem = () => {
        setItems([...items, { id: Math.random().toString(36), item: '', value: '', unit: '', evaluation: '' }]);
    };
    const removeItem = (id: string) => {
        setItems(items.filter(i => i.id !== id));
    };
    const updateItem = (id: string, field: keyof HealthItem, val: string) => {
        setItems(items.map(i => i.id === id ? { ...i, [field]: val } : i));
    };


    // --- Submit Logic ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Process sections and upload images
            const processedSections = [];

            // Flatten images for main "images" field in DB
            const allImageUrls: string[] = [];

            for (const section of sections) {
                const finalSectionImages = [];
                for (const img of section.images) {
                    if (img.file) {
                        const formData = new FormData();
                        formData.append('file', img.file);
                        const res = await uploadImage(formData);
                        if (res.success && res.url) {
                            finalSectionImages.push({ url: res.url, title: img.title });
                            allImageUrls.push(res.url);
                        } else {
                            throw new Error('Image Upload Failed');
                        }
                    } else {
                        finalSectionImages.push({ url: img.url, title: img.title });
                        allImageUrls.push(img.url);
                    }
                }
                processedSections.push({
                    title: section.title,
                    content: section.content,
                    images: finalSectionImages
                });
            }

            const formattedResults = items
                .filter(i => i.item.trim() !== '')
                .map(i => ({
                    item: i.item,
                    value: i.value ? parseFloat(i.value) : null,
                    unit: i.unit,
                    evaluation: i.evaluation,
                    category: 'Manual'
                }));

            const payload = {
                date,
                title,
                summary,
                results: formattedResults,
                meta: {
                    hospitalName,
                    // age: age ? parseInt(age) : null,
                    sections: processedSections // New consolidated structure
                },
                images: allImageUrls // Legacy/Gallery support
            };

            const res = await onSubmit(payload);
            if (res.success) {
                toast.success('保存しました');
            } else {
                showErrorToast(res.error || '保存に失敗しました');
            }

        } catch (error) {
            console.error(error);
            showErrorToast('エラーが発生しました');
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {/* --- Text Parsing --- */}
            {!initialData && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm space-y-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-purple-500" />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
                            AI自動入力
                        </span>
                    </h3>

                    <textarea
                        value={rawText}
                        onChange={(e) => setRawText(e.target.value)}
                        placeholder="健康診断結果のテキストを貼り付けてください..."
                        className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-lg min-h-[100px] focus:ring-2 focus:ring-[#00CED1]/20 focus:border-[#00CED1] outline-none text-sm font-mono text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-900 placeholder:text-gray-400 dark:placeholder:text-slate-500"
                    />
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={() => setIsOcrUploadOpen(true)}
                            className="bg-teal-500 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-teal-600 shadow-md transition-all flex items-center gap-2 text-sm"
                        >
                            <FileText className="w-4 h-4" />
                            OCR入力
                        </button>
                        <button
                            type="button"
                            onClick={handleParseText}
                            disabled={isParsing || !rawText.trim()}
                            className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white px-6 py-2.5 rounded-lg font-bold hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50 text-sm shadow-md"
                        >
                            {isParsing ? '解析中...' : 'AIで解析して入力'}
                            {!isParsing && <Sparkles className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

            )}

            <Modal isOpen={isOcrUploadOpen} onClose={() => setIsOcrUploadOpen(false)} title="OCR入力 (画像/PDF)">
                <OcrUploader onImport={handleOcrImport} />
            </Modal>


            {/* --- Basic Info --- */}
            {!hideBasicInfo && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm space-y-4">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-[#00CED1]" /> 基本情報・要点
                    </h3>
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="md:w-auto">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">診断日</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400 dark:text-gray-500" />
                                <input
                                    type="date"
                                    required
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    className="pl-10 w-full md:w-[180px] p-2 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-[#00CED1]/20 focus:border-[#00CED1] outline-none text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-900"
                                />
                            </div>
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">タイトル</label>
                            <input
                                type="text"
                                placeholder="健康診断 2024"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full p-2 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-[#00CED1]/20 focus:border-[#00CED1] outline-none text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-900 placeholder:text-gray-400 dark:placeholder:text-slate-500"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">病院名</label>
                            <div className="relative">
                                <Building className="absolute left-3 top-3 w-4 h-4 text-gray-400 dark:text-gray-500" />
                                <input
                                    type="text"
                                    placeholder="例: 新宿クリニック"
                                    value={hospitalName}
                                    onChange={e => setHospitalName(e.target.value)}
                                    className="pl-10 w-full p-2 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-[#00CED1]/20 focus:border-[#00CED1] outline-none text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-900 placeholder:text-gray-400 dark:placeholder:text-slate-500"
                                />
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">要点</label>
                        <textarea
                            placeholder="診断結果の要約や気になった点などを自由に入力してください..."
                            value={summary}
                            onChange={e => setSummary(e.target.value)}
                            className="w-full p-2 h-20 border border-gray-200 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-[#00CED1]/20 focus:border-[#00CED1] outline-none text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-900 placeholder:text-gray-400 dark:placeholder:text-slate-500"
                        />
                    </div>
                </div>
            )}

            {/* --- Items Table --- */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-100 dark:border-slate-700 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                        <Plus className="w-5 h-5 text-[#00CED1]" /> 検査項目
                    </h3>
                    <button
                        type="button"
                        onClick={() => setIsImportModalOpen(true)}
                        className="text-xs bg-[#E0F7FA] dark:bg-teal-900/30 text-[#006064] dark:text-teal-400 px-3 py-1.5 rounded-full font-bold hover:bg-[#B2EBF2] dark:hover:bg-teal-900/50 transition-colors flex items-center gap-1"
                    >
                        <Plus className="w-3 h-3" />
                        Data追加
                    </button>
                </div>
                <div className="space-y-2">
                    {/* Header Row */}
                    <div className="hidden md:grid grid-cols-12 gap-2 text-sm text-gray-500 dark:text-gray-400 font-medium px-2">
                        <div className="col-span-4">項目名</div>
                        <div className="col-span-3">数値</div>
                        <div className="col-span-2">単位</div>
                        <div className="col-span-2">判定</div>
                        <div className="col-span-1"></div>
                    </div>
                    {items.map((item) => (
                        <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center bg-gray-50 dark:bg-slate-700/50 p-2 rounded-lg">
                            <div className="col-span-4">
                                <input
                                    type="text"
                                    placeholder="項目名"
                                    value={item.item ?? ''}
                                    onChange={e => updateItem(item.id, 'item', e.target.value)}
                                    className="w-full bg-transparent border-gray-300 md:border-none focus:ring-0 p-1 font-medium placeholder-gray-400 dark:placeholder:text-slate-500 text-gray-900 dark:text-gray-100"
                                />
                            </div>
                            <div className="col-span-3">
                                <input
                                    type="number"
                                    placeholder="数値"
                                    value={item.value ?? ''}
                                    onChange={e => updateItem(item.id, 'value', e.target.value)}
                                    className="w-full bg-transparent border-gray-300 md:border-none focus:ring-0 p-1 font-mono placeholder-gray-400 dark:placeholder:text-slate-500 text-gray-900 dark:text-gray-100"
                                />
                            </div>
                            <div className="col-span-2">
                                <input
                                    type="text"
                                    placeholder="単位"
                                    value={item.unit ?? ''}
                                    onChange={e => updateItem(item.id, 'unit', e.target.value)}
                                    className="w-full bg-transparent border-gray-300 md:border-none focus:ring-0 p-1 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder:text-slate-600"
                                />
                            </div>
                            <div className="col-span-2">
                                <input
                                    type="text"
                                    placeholder="判定"
                                    value={item.evaluation ?? ''}
                                    onChange={e => updateItem(item.id, 'evaluation', e.target.value)}
                                    className="w-full bg-transparent border-gray-300 md:border-none focus:ring-0 p-1 text-center font-medium text-gray-900 dark:text-gray-100"
                                />
                            </div>
                            <div className="col-span-1 text-right flex items-center justify-end gap-1">
                                <button type="button" onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                <button
                    type="button"
                    onClick={addItem}
                    className="w-full py-2 border-2 border-dashed border-gray-200 dark:border-slate-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-[#00CED1] hover:text-[#00CED1] hover:bg-[#00CED1]/5 dark:hover:bg-[#00CED1]/10 transition-all text-sm font-medium items-center justify-center flex gap-1"
                >
                    <Plus className="w-4 h-4" /> 行を追加
                </button>
            </div>

            {/* --- Unified Sections (Title + Content + Images) --- */}
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200 flex items-center gap-2">
                        <FileText className="w-6 h-6 text-[#00CED1]" /> 記録・メモ・画像
                    </h3>
                </div>

                {sections.map((section, index) => (
                    <div key={section.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm relative animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Controls (Move Up/Down + Delete) */}
                        <div className="absolute top-4 right-4 flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => moveSection(index, 'up')}
                                disabled={index === 0}
                                className="text-gray-300 dark:text-slate-600 hover:text-[#00CED1] disabled:opacity-30 disabled:hover:text-gray-300 transition-colors p-1"
                                title="上に移動"
                            >
                                <ChevronUp className="w-5 h-5" />
                            </button>
                            <button
                                type="button"
                                onClick={() => moveSection(index, 'down')}
                                disabled={index === sections.length - 1}
                                className="text-gray-300 dark:text-slate-600 hover:text-[#00CED1] disabled:opacity-30 disabled:hover:text-gray-300 transition-colors p-1"
                                title="下に移動"
                            >
                                <ChevronDown className="w-5 h-5" />
                            </button>
                            <div className="w-px h-4 bg-gray-200 dark:bg-slate-700 mx-1"></div>
                            <button
                                type="button"
                                onClick={() => removeSection(section.id)}
                                className="text-gray-300 dark:text-slate-600 hover:text-red-500 transition-colors p-1"
                                title="このセクションを削除"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Title */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 mb-1">タイトル</label>
                                <input
                                    type="text"
                                    placeholder="例: 医師からのアドバイス、心電図の結果..."
                                    value={section.title}
                                    onChange={(e) => updateSection(section.id, 'title', e.target.value)}
                                    className="w-full text-lg font-bold text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder:text-slate-600 border-b-2 border-transparent focus:border-[#00CED1] outline-none bg-transparent transition-colors py-1"
                                />
                            </div>

                            {/* Content */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 mb-1">内容・メモ</label>
                                <textarea
                                    placeholder="詳細な内容を入力してください..."
                                    value={section.content}
                                    onChange={(e) => updateSection(section.id, 'content', e.target.value)}
                                    className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-lg min-h-[180px] focus:ring-2 focus:ring-[#00CED1]/20 focus:border-[#00CED1] outline-none resize-y text-gray-900 dark:text-gray-100 dark:bg-slate-900 leading-relaxed placeholder:text-gray-400 dark:placeholder:text-slate-600"
                                />
                            </div>

                            {/* Images Dropzone & List */}
                            <div>
                                <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 mb-2">関連ファイル (画像・PDFなど)</label>

                                <div className="space-y-4">
                                    {/* Image/File List */}
                                    {section.images.length > 0 && (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {section.images.map((img) => {
                                                const isPdf = img.file
                                                    ? img.file.type === 'application/pdf'
                                                    : img.url.toLowerCase().includes('.pdf');

                                                // Simple image check based on extension or type
                                                const isImage = img.file
                                                    ? img.file.type.startsWith('image/')
                                                    : /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(img.url);

                                                return (
                                                    <div key={img.id} className="relative group">
                                                        <div className="aspect-video bg-gray-100 dark:bg-slate-700 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-600 flex items-center justify-center relative">
                                                            {isPdf ? (
                                                                <iframe
                                                                    src={`${img.url}#view=FitH&toolbar=0&navpanes=0&scrollbar=0`}
                                                                    className="w-full h-full pointer-events-none"
                                                                    title={img.title}
                                                                    loading="lazy"
                                                                />
                                                            ) : isImage ? (
                                                                <img src={img.url} alt="preview" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="flex flex-col items-center justify-center text-gray-500 p-2 w-full h-full bg-gray-50 dark:bg-slate-800">
                                                                    <FileText className="w-8 h-8 mb-1 text-gray-400" />
                                                                    <span className="text-[10px] text-center w-full truncate px-1">{img.title}</span>
                                                                    <span className="text-[9px] text-gray-400 uppercase">{img.file?.name.split('.').pop() || 'FILE'}</span>
                                                                </div>
                                                            )}

                                                            {/* Overlay for non-images to indicate it's a file? Or just rely on look. */}
                                                            {/* Click to open full view could be added here, but currently just a preview list. */}
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeImageFromSection(section.id, img.id)}
                                                            className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 z-10"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                        <input
                                                            type="text"
                                                            value={img.title}
                                                            onChange={(e) => updateImageTitleInSection(section.id, img.id, e.target.value)}
                                                            placeholder="タイトル... "
                                                            className="mt-1 w-full text-xs border border-gray-200 dark:border-slate-600 rounded px-1 py-1 text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 focus:border-[#00CED1] outline-none"
                                                        />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Dropzone */}
                                    <div
                                        className={`relative border-2 border-dashed rounded-lg p-6 transition-all text-center ${dragActiveSectionId === section.id
                                            ? 'border-[#00CED1] bg-[#00CED1]/5 scale-[1.01]'
                                            : 'border-gray-200 dark:border-slate-600 hover:border-[#00CED1] hover:bg-gray-50 dark:hover:bg-slate-900 dark:bg-slate-800'
                                            }`}
                                        onDragEnter={(e) => handleDrag(e, section.id)}
                                        onDragLeave={(e) => handleDrag(e, section.id)}
                                        onDragOver={(e) => handleDrag(e, section.id)}
                                        onDrop={(e) => handleDrop(e, section.id)}
                                    >
                                        <input
                                            type="file"
                                            multiple
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            onChange={(e) => handleFileSelect(e, section.id)}
                                        />
                                        <div className="pointer-events-none flex flex-row items-center justify-center gap-3 text-gray-400 dark:text-slate-500">
                                            <Upload className="w-5 h-5" />
                                            <span className="text-sm font-medium">ファイルをドラッグ＆ドロップ、またはクリックして追加</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                <button
                    type="button"
                    onClick={addSection}
                    className="w-full py-3 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 hover:border-gray-900 hover:text-gray-900 transition-all font-bold flex items-center justify-center gap-2"
                >
                    <Plus className="w-4 h-4" /> 記録・メモ・画像
                </button>
            </div>

            {/* --- Actions --- */}
            <div className="flex justify-end gap-3 pt-8 border-t border-gray-100">
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-6 py-2.5 rounded-full text-gray-600 font-medium hover:bg-gray-100 transition-colors"
                        disabled={isSubmitting}
                    >
                        キャンセル
                    </button>
                )}
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-gray-900 text-white px-8 py-2.5 rounded-full hover:bg-gray-800 transition-shadow shadow-lg hover:shadow-xl font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <Save className="w-5 h-5" />
                    )}
                    保存する
                </button>
            </div>
            {/* Import Modal */}
            <DataImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onImport={(newItems) => {
                    setItems(prev => [...prev, ...newItems]);
                }}
            />
        </form >
    );
}
