'use client';

import { useState } from 'react';
import { Activity, Copy, ChevronDown, Filter, Table } from 'lucide-react';
import LifestyleTab from '@/components/habits/LifestyleTab';
import SupplementsTab from '@/components/habits/SupplementsTab';
import { CATEGORIES, PREDEFINED_ITEMS } from '@/constants/habits';
import { toast } from 'sonner';
import Header from '@/components/Header';

interface Props {
    habits: any[];
    supplements: any[];
}

export default function HabitsPageClient({ habits: initialHabits, supplements: initialSupplements }: Props) {
    const [activeTab, setActiveTab] = useState<'habits' | 'supplements'>('habits');
    const [habits, setHabits] = useState(initialHabits);
    const [supplements, setSupplements] = useState(initialSupplements);
    const [showCopyMenu, setShowCopyMenu] = useState(false);

    const getHabitsText = (): string => {
        let text = "";
        CATEGORIES.forEach(cat => {
            const catHabits = habits.filter((h: any) => h.category === cat.id);
            const itemsLines: string[] = [];

            // Predefined
            PREDEFINED_ITEMS[cat.id]?.forEach(item => {
                const habit = catHabits.find((h: any) => h.name === item.name);
                if (!habit || !habit.value) return;

                const valueStrParts: string[] = [];
                item.inputs.forEach(input => {
                    const val = habit.value[input.key];
                    if (val && val !== '0' && val !== 0 && val !== '') {
                        valueStrParts.push(`${input.label}${val}${input.suffix}`);
                    }
                });

                if (valueStrParts.length > 0) {
                    itemsLines.push(`${item.name}　${valueStrParts.join(' ')}`);
                }
            });

            // Custom (Generic)
            const predefinedNames = new Set(PREDEFINED_ITEMS[cat.id]?.map(i => i.name) || []);
            const customHabits = catHabits.filter((h: any) => !predefinedNames.has(h.name));
            customHabits.forEach((h: any) => {
                const val = h.value?.value;
                if (val && val !== '0' && val !== 0 && val !== '') {
                    itemsLines.push(`${h.name}　${val}${h.value?.custom_unit || ''}`);
                }
            });

            if (itemsLines.length > 0) {
                text += `＜${cat.label}＞\n${itemsLines.join('\n')}\n\n`;
            }
        });
        return text;
    };

    const getSupplementsText = (): string => {
        let text = "";
        if (supplements.length > 0) {
            text += `＜サプリメント＞\n`;
            supplements.forEach((sup: any) => {
                text += `${sup.name} ${sup.amount}${sup.unit} (${sup.timing})\n`;
            });
        }
        return text;
    };

    const handleCopy = (copyAll: boolean) => {
        let text = "";

        if (copyAll) {
            text = getHabitsText() + getSupplementsText();
        } else {
            // Copy only current tab
            if (activeTab === 'habits') {
                text = getHabitsText();
            } else {
                text = getSupplementsText();
            }
        }

        if (!text) {
            toast.error('コピーするデータがありません（0または未入力の項目はスキップされます）');
            setShowCopyMenu(false);
            return;
        }

        navigator.clipboard.writeText(text).then(() => {
            toast.success('クリップボードにコピーしました');
            setShowCopyMenu(false);
        }).catch(err => {
            console.error(err);
            toast.error('コピーに失敗しました');
            setShowCopyMenu(false);
        });
    };

    return (
        <div className="min-h-screen pb-24 md:pb-8 bg-gray-50 dark:bg-slate-900">
            <Header />
            <div className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 sticky top-0 md:top-16 z-30">
                <div className="max-w-3xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
                    <h1 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                        <Activity className="w-5 h-5 text-teal-500" />
                        生活習慣・サプリ
                    </h1>
                    <div className="relative">
                        <button
                            onClick={() => setShowCopyMenu(!showCopyMenu)}
                            className="text-xs font-bold flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                        >
                            <Copy className="w-3.5 h-3.5" />
                            情報コピー
                            <ChevronDown className="w-3 h-3" />
                        </button>
                        {showCopyMenu && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowCopyMenu(false)}
                                />
                                <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 min-w-[180px] py-1 animate-in fade-in zoom-in-95 duration-150">
                                    <button
                                        onClick={() => handleCopy(false)}
                                        className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                                    >
                                        <Filter className="w-4 h-4 text-teal-500" />
                                        {activeTab === 'habits' ? '生活習慣のみ' : 'サプリのみ'}
                                    </button>
                                    <button
                                        onClick={() => handleCopy(true)}
                                        className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                                    >
                                        <Table className="w-4 h-4 text-blue-500" />
                                        全データ
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 md:px-6 pt-6">
                <div className="flex gap-2 p-1 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 mb-6 shadow-sm">
                    <button
                        onClick={() => setActiveTab('habits')}
                        className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all duration-200 ${activeTab === 'habits'
                                ? 'bg-teal-500 text-white shadow-md shadow-teal-200 dark:shadow-none'
                                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                            }`}
                    >
                        生活習慣リスト
                    </button>
                    <button
                        onClick={() => setActiveTab('supplements')}
                        className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all duration-200 ${activeTab === 'supplements'
                                ? 'bg-teal-500 text-white shadow-md shadow-teal-200 dark:shadow-none'
                                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                            }`}
                    >
                        サプリメント
                    </button>
                </div>

                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {activeTab === 'habits' ? (
                        <LifestyleTab habits={habits} setHabits={setHabits} />
                    ) : (
                        <SupplementsTab supplements={supplements} setSupplements={setSupplements} />
                    )}
                </div>
            </div>
        </div>
    );
}
