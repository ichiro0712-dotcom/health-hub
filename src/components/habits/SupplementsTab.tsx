'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Pill, GripVertical, Calendar, X as XIcon } from 'lucide-react';
import { addSupplement, updateSupplement, deleteSupplement, reorderSupplements } from '@/app/actions/supplements';
import { toast } from 'sonner';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface PausedPeriod {
    from: string;
    to: string;
}

interface Supplement {
    id: string;
    name: string;
    timing: string[];
    amount: string;
    unit: string;
    manufacturer?: string | null;
    note?: string | null;
    order: number;
    startDate?: Date | string | null; // Allow string for easy form handling
    pausedPeriods?: PausedPeriod[] | null;
}

interface Props {
    supplements: Supplement[];
    setSupplements: React.Dispatch<React.SetStateAction<Supplement[]>>;
}

function SortableItem({ sup, onEdit, onDelete }: { sup: Supplement, onEdit: (s: Supplement) => void, onDelete: (id: string) => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: sup.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 last:border-0"
        >
            <div className="flex items-center flex-1 gap-3 overflow-hidden">
                <button
                    {...attributes}
                    {...listeners}
                    className="text-slate-300 hover:text-slate-500 cursor-move touch-none"
                >
                    <GripVertical className="w-5 h-5" />
                </button>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-800 dark:text-white truncate">{sup.name}</span>
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                            {sup.amount}{sup.unit}
                        </span>
                        {sup.manufacturer && <span className="text-xs text-slate-400">({sup.manufacturer})</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {Array.isArray(sup.timing) && sup.timing.map(t => (
                            <span key={t} className="text-[10px] bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded border border-amber-100 dark:border-amber-800/50">
                                {t}
                            </span>
                        ))}
                        {sup.startDate && (
                            <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                                <Calendar className="w-3 h-3" />
                                {new Date(sup.startDate).toLocaleDateString()}~
                            </span>
                        )}
                        {sup.note && <span className="text-xs text-slate-400 truncate max-w-[200px] border-l border-slate-200 dark:border-slate-700 pl-2">{sup.note}</span>}
                    </div>
                </div>
            </div>

            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                <button onClick={() => onEdit(sup)} className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-full transition-colors">
                    <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => onDelete(sup.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

export default function SupplementsTab({ supplements, setSupplements }: Props) {

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Supplement | null>(null);
    const [pausedPeriods, setPausedPeriods] = useState<PausedPeriod[]>([]);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            const oldIndex = supplements.findIndex((i) => i.id === active.id);
            const newIndex = supplements.findIndex((i) => i.id === over?.id);

            const newItems = arrayMove(supplements, oldIndex, newIndex);

            setSupplements(newItems);

            // Update order in DB
            const updates = newItems.map((item, index) => ({
                id: item.id,
                order: index
            }));
            reorderSupplements(updates);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('削除しますか？')) return;
        const res = await deleteSupplement(id);
        if (res.success) {
            toast.success('削除しました');
            setSupplements(prev => prev.filter(s => s.id !== id));
        } else {
            toast.error('削除に失敗しました');
        }
    };

    const handleOpenModal = (item?: Supplement) => {
        if (item) {
            setEditingItem(item);
            // Ensure pausedPeriods is array
            const periods = Array.isArray(item.pausedPeriods) ? item.pausedPeriods : [];
            setPausedPeriods([...periods]);
        } else {
            setEditingItem(null);
            setPausedPeriods([]);
        }
        setIsModalOpen(true);
    };

    const handleAddPeriod = () => {
        setPausedPeriods([...pausedPeriods, { from: '', to: '' }]);
    };

    const handleRemovePeriod = (index: number) => {
        setPausedPeriods(pausedPeriods.filter((_, i) => i !== index));
    };

    const handlePeriodChange = (index: number, field: 'from' | 'to', value: string) => {
        const newPeriods = [...pausedPeriods];
        newPeriods[index] = { ...newPeriods[index], [field]: value };
        setPausedPeriods(newPeriods);
    };

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        const startDateStr = formData.get('startDate') as string;
        const startDate = startDateStr ? new Date(startDateStr) : null;

        const data = {
            name: formData.get('name') as string,
            timing: formData.getAll('timing') as string[],
            amount: formData.get('amount') as string,
            unit: formData.get('unit') as string,
            manufacturer: formData.get('manufacturer') as string,
            note: formData.get('note') as string,
            startDate: startDate,
            pausedPeriods: pausedPeriods.filter(p => p.from || p.to), // Filter out empty strings if strict, but 'from' is critical
        };

        if (data.timing.length === 0) {
            toast.error('タイミングを選択してください');
            return;
        }

        if (editingItem) {
            const res = await updateSupplement(editingItem.id, data);
            if (res.success && res.data) {
                const updatedData = res.data as Supplement;
                setSupplements(prev => prev.map(s => s.id === editingItem.id ? { ...updatedData, order: s.order } : s));
                toast.success('更新しました');
            }
        } else {
            const res = await addSupplement(data);
            if (res.success && res.data) {
                const newData = res.data as Supplement;
                setSupplements(prev => [...prev, newData]);
                toast.success('追加しました');
            } else {
                toast.error('追加に失敗しました');
            }
        }
        setIsModalOpen(false);
        setEditingItem(null);
        setPausedPeriods([]);
    };

    const TIMING_OPTIONS = [
        "起床後",
        "朝",
        "昼",
        "夕",
        "就寝前",
        "飲酒時",
        "いつでも"
    ];

    const formatDateForInput = (date: Date | string | null | undefined) => {
        if (!date) return '';
        const d = new Date(date);
        return d.toISOString().split('T')[0];
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div>
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Pill className="w-5 h-5 text-teal-500" />
                        サプリメント管理
                    </h3>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-sm shadow-teal-200 dark:shadow-none"
                >
                    <Plus className="w-4 h-4" /> 追加
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                {supplements.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">
                        サプリメントはまだ登録されていません
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={supplements.map(s => s.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="divide-y divide-gray-100 dark:divide-slate-700">
                                {supplements.map(sup => (
                                    <SortableItem
                                        key={sup.id}
                                        sup={sup}
                                        onEdit={(s) => handleOpenModal(s)}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
                        <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
                            <h3 className="font-bold text-slate-800 dark:text-white">
                                {editingItem ? 'サプリメントを編集' : '新しいサプリを追加'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600" aria-label="閉じる">×</button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">サプリメント名 <span className="text-red-500">*</span></label>
                                <input name="name" required defaultValue={editingItem?.name} className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800 placeholder-slate-400 text-slate-800 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none" placeholder="例: ビタミンC" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">飲むタイミング <span className="text-red-500">*</span></label>
                                    <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-600">
                                        {TIMING_OPTIONS.map(opt => {
                                            const isChecked = Array.isArray(editingItem?.timing)
                                                ? editingItem.timing.includes(opt)
                                                : typeof editingItem?.timing === 'string' && editingItem.timing === opt;

                                            return (
                                                <label key={opt} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        name="timing"
                                                        value={opt}
                                                        defaultChecked={isChecked}
                                                        className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500 border-gray-300"
                                                    />
                                                    <span className="text-sm text-slate-700 dark:text-slate-300">{opt}</span>
                                                </label>
                                            )
                                        })}
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">メーカー</label>
                                        <input name="manufacturer" defaultValue={editingItem?.manufacturer || ''} className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800 placeholder-slate-400 text-slate-800 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none" placeholder="例: DHC" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">飲み始めた日</label>
                                        <input
                                            type="date"
                                            name="startDate"
                                            defaultValue={formatDateForInput(editingItem?.startDate)}
                                            className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">摂取量 <span className="text-red-500">*</span></label>
                                    <input name="amount" required defaultValue={editingItem?.amount} className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800 placeholder-slate-400 text-slate-800 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none" placeholder="例: 1" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">単位 <span className="text-red-500">*</span></label>
                                    <input name="unit" required defaultValue={editingItem?.unit} className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800 placeholder-slate-400 text-slate-800 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none" placeholder="例: 錠" />
                                </div>
                            </div>

                            {/* Paused Periods */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">休んでいた期間</label>
                                <div className="space-y-2">
                                    {pausedPeriods.map((period, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <input
                                                type="date"
                                                value={period.from}
                                                onChange={(e) => handlePeriodChange(idx, 'from', e.target.value)}
                                                className="flex-1 p-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-white"
                                            />
                                            <span className="text-slate-400">~</span>
                                            <input
                                                type="date"
                                                value={period.to}
                                                onChange={(e) => handlePeriodChange(idx, 'to', e.target.value)}
                                                className="flex-1 p-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm text-slate-800 dark:text-white"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleRemovePeriod(idx)}
                                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                            >
                                                <XIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={handleAddPeriod}
                                        className="text-xs font-bold text-teal-600 hover:text-teal-700 hover:bg-teal-50 px-3 py-1.5 rounded-full border border-teal-200 transition-all flex items-center gap-1"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> 期間を追加
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">メモ</label>
                                <textarea name="note" defaultValue={editingItem?.note || ''} className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800 placeholder-slate-400 text-slate-800 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none h-20 resize-none" placeholder="補足情報など" />
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">キャンセル</button>
                                <button type="submit" className="flex-1 py-2.5 bg-teal-500 text-white font-bold rounded-lg hover:bg-teal-600 transition-colors shadow-lg shadow-teal-200 dark:shadow-none">保存する</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
