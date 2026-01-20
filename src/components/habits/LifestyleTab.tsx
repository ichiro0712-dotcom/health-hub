import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Loader2, Trash2 } from 'lucide-react';
import { upsertLifestyleHabit, deleteLifestyleHabit } from '@/app/actions/habits';
import { toast } from 'sonner';
import { CATEGORIES, PREDEFINED_ITEMS } from '@/constants/habits';

interface LifestyleHabit {
    id: string;
    category: string;
    name: string;
    value: any;
}

interface Props {
    habits: LifestyleHabit[];
    setHabits: React.Dispatch<React.SetStateAction<LifestyleHabit[]>>;
}

export default function LifestyleTab({ habits, setHabits }: Props) {
    const [openCategories, setOpenCategories] = useState<string[]>(['preferences']); // Default open first
    const [saving, setSaving] = useState<string | null>(null); // key of item being saved
    const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
    const [newItemCategory, setNewItemCategory] = useState<string>('');


    const toggleCategory = (id: string) => {
        setOpenCategories(prev =>
            prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
        );
    };

    const handleAddCustomItem = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        const unit = formData.get('unit') as string;

        // Save an initial value to create the habit entry
        const initialValue = { custom_unit: unit, value: '' };

        // Optimistically update
        const tempId = `temp-${Date.now()}`;
        const newHabit: LifestyleHabit = {
            id: tempId,
            category: newItemCategory,
            name: name,
            value: initialValue
        };
        setHabits(prev => [...prev, newHabit]);

        try {
            const res = await upsertLifestyleHabit(newItemCategory, name, initialValue);
            if (res.success && res.data) {
                // Replace temp ID with real one
                setHabits(prev => prev.map(h => h.id === tempId ? res.data! : h));
                toast.success('追加しました');
            } else {
                toast.error('追加に失敗しました');
                setHabits(prev => prev.filter(h => h.id !== tempId)); // Revert
            }
        } catch (error) {
            console.error(error);
            toast.error('エラーが発生しました');
            setHabits(prev => prev.filter(h => h.id !== tempId)); // Revert
        }

        setIsCustomModalOpen(false);
    };

    const handleSave = async (category: string, name: string, value: any) => {
        const key = `${category}-${name}`;
        setSaving(key);
        const res = await upsertLifestyleHabit(category, name, value);
        if (res.success && res.data) {
            toast.success('保存しました');
            // Update local state upsert logic
            setHabits(prev => {
                const idx = prev.findIndex(h => h.category === category && h.name === name);
                if (idx >= 0) {
                    const next = [...prev];
                    next[idx] = res.data;
                    return next;
                }
                return [...prev, res.data];
            });
        } else {
            toast.error('保存に失敗しました');
        }
        setSaving(null);
    };

    const getHabitValue = (category: string, name: string, key: string) => {
        const habit = habits.find(h => h.category === category && h.name === name);
        return habit?.value?.[key] || '';
    };

    return (
        <div className="space-y-4">
            {CATEGORIES.map(cat => (
                <div key={cat.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                    <button
                        onClick={() => toggleCategory(cat.id)}
                        className="w-full flex justify-between items-center p-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                        <h3 className="font-bold text-slate-700 dark:text-slate-200">{cat.label}</h3>
                        {openCategories.includes(cat.id) ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </button>

                    {openCategories.includes(cat.id) && (
                        <div className="p-4 pt-0 border-t border-gray-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                            <div className="grid gap-4 pt-4">
                                {PREDEFINED_ITEMS[cat.id]?.map(item => (
                                    <div key={item.name} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm">
                                        <div className="min-w-[140px] font-medium text-slate-700 dark:text-slate-300">
                                            {item.name}
                                        </div>
                                        <div className="flex-1 flex flex-wrap gap-4 items-center">
                                            {item.inputs.map(input => (
                                                <div key={input.key} className="flex items-center gap-2">
                                                    <span className="text-xs text-slate-400">{input.label}</span>
                                                    <input
                                                        type={input.type || "number"}
                                                        placeholder="0"
                                                        className="w-20 px-2 py-1 text-right border border-slate-200 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-teal-500 outline-none text-slate-800 dark:text-white"
                                                        defaultValue={getHabitValue(cat.id, item.name, input.key)}
                                                        onBlur={(e) => {
                                                            const currentVal = habits.find(h => h.category === cat.id && h.name === item.name)?.value || {};
                                                            if (currentVal[input.key] !== e.target.value) {
                                                                handleSave(cat.id, item.name, { ...currentVal, [input.key]: e.target.value });
                                                            }
                                                        }}
                                                    />
                                                    <span className="text-sm text-slate-500 dark:text-slate-400">{input.suffix}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="w-6 flex justify-center">
                                            {saving === `${cat.id}-${item.name}` && <Loader2 className="w-4 h-4 text-teal-500 animate-spin" />}
                                        </div>
                                    </div>
                                ))}

                                {/* Custom Item Addition Placeholder (Simplified for now) */}
                                <div className="text-center p-2">
                                    <button className="text-xs text-slate-400 hover:text-teal-600 flex items-center justify-center gap-1 mx-auto transition-colors">
                                        <Plus className="w-3 h-3" /> 項目を追加
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
