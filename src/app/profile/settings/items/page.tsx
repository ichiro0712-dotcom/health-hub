'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { Settings, Save, Search, AlertCircle, TrendingUp, Tags, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { getUniqueHealthItems, getUserItemSettings, updateUserItemSetting } from '@/app/actions/settings';
import { DEFAULT_ITEM_SETTINGS } from '@/constants/health-items';
import toast from 'react-hot-toast';

interface ItemSetting {
    itemName: string;
    minVal: number;
    maxVal: number;
    safeMin?: number | null;
    safeMax?: number | null;
    tags: string[];
}

export default function ItemSettingsPage() {
    const [items, setItems] = useState<string[]>([]);
    const [settings, setSettings] = useState<Record<string, ItemSetting>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedItem, setSelectedItem] = useState<string | null>(null);

    // Form State
    const [editForm, setEditForm] = useState<ItemSetting>({
        itemName: '',
        minVal: 0,
        maxVal: 100,
        safeMin: null,
        safeMax: null,
        tags: []
    });

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            const [itemsRes, settingsRes] = await Promise.all([
                getUniqueHealthItems(),
                getUserItemSettings()
            ]);

            if (itemsRes.success && itemsRes.data) {
                setItems(itemsRes.data);
            }

            if (settingsRes.success && settingsRes.data) {
                const sMap: Record<string, ItemSetting> = {};

                // Load defaults first
                Object.entries(DEFAULT_ITEM_SETTINGS).forEach(([key, val]) => {
                    sMap[key] = { itemName: key, ...val };
                });

                // Overwrite with user settings, but merge tags
                settingsRes.data.forEach((userSetting: any) => {
                    const defaultSetting = sMap[userSetting.itemName];
                    if (defaultSetting) {
                        sMap[userSetting.itemName] = {
                            ...userSetting,
                            tags: Array.from(new Set([...(defaultSetting.tags || []), ...(userSetting.tags || [])]))
                        };
                    } else {
                        sMap[userSetting.itemName] = userSetting;
                    }
                });
                setSettings(sMap);
            }
            setIsLoading(false);
        };
        loadData();
    }, []);

    const handleSelect = (item: string) => {
        setSelectedItem(item);
        const current = settings[item];
        if (current) {
            setEditForm(current);
        } else {
            setEditForm({
                itemName: item,
                minVal: 0,
                maxVal: 100,
                safeMin: null,
                safeMax: null,
                tags: []
            });
        }
    };

    const handleSave = async () => {
        if (!selectedItem) return;

        const res = await updateUserItemSetting(selectedItem, editForm);
        if (res.success) {
            toast.success(`${selectedItem}の設定を保存しました`);
            setSettings(prev => ({ ...prev, [selectedItem]: editForm }));
            // Optionally close or stay
        } else {
            toast.error('保存に失敗しました');
        }
    };

    const filteredItems = items.filter(i =>
        i.toLowerCase().includes(searchQuery.toLowerCase()) ||
        settings[i]?.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="min-h-screen pb-24 md:pb-8">
            <Header />

            <div className="max-w-5xl mx-auto px-4 md:px-6 pt-6">
                <div className="flex items-center gap-2 mb-6 text-sm text-slate-500 dark:text-slate-400">
                    <Link href="/trends" className="hover:text-teal-600 dark:hover:text-teal-400 flex items-center gap-1">
                        <ChevronLeft className="w-4 h-4" /> 推移分析
                    </Link>
                    <span>/</span>
                    <span className="font-bold text-slate-700 dark:text-slate-200">基準値・タグ設定</span>
                </div>

                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Settings className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                            検査項目の設定
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                            グラフの表示範囲や、医学的な適正範囲（基準値）を設定できます。
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-250px)] min-h-[500px]">
                    {/* Item List Sidebar */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="項目を検索..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 p-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-700 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all placeholder:text-slate-400"
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                            {isLoading ? (
                                <div className="p-8 text-center text-slate-400">
                                    <div className="animate-spin w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full mx-auto mb-2" />
                                    Loading...
                                </div>
                            ) : filteredItems.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-sm">
                                    見つかりませんでした
                                </div>
                            ) : (
                                filteredItems.map(item => (
                                    <button
                                        key={item}
                                        onClick={() => handleSelect(item)}
                                        className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all flex justify-between items-center group ${selectedItem === item
                                            ? 'bg-teal-50 text-teal-700 font-bold shadow-sm ring-1 ring-teal-100'
                                            : 'hover:bg-slate-50 text-slate-600'
                                            }`}
                                    >
                                        <span className="truncate">{item}</span>
                                        {settings[item] && (
                                            <div className="w-2 h-2 rounded-full bg-teal-400 shadow-sm" />
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Editor Panel */}
                    <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex flex-col form-container">
                        {selectedItem ? (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-800">{selectedItem}</h2>
                                        <p className="text-xs text-slate-400 mt-1">設定を編集しています</p>
                                    </div>
                                    <button
                                        onClick={handleSave}
                                        className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2 rounded-full font-bold hover:bg-slate-800 shadow-md hover:shadow-lg transition-all active:scale-95"
                                    >
                                        <Save className="w-4 h-4" />
                                        保存する
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Graph Scale Settings */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="p-1.5 bg-blue-50 rounded text-blue-600">
                                                <TrendingUp className="w-4 h-4" />
                                            </div>
                                            <h3 className="font-bold text-slate-700">グラフ表示設定</h3>
                                        </div>
                                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-4">
                                            <p className="text-xs text-slate-500 mb-2 leading-relaxed">
                                                グラフの縦軸（0%〜100%）に割り当てる値の範囲を設定します。<br />
                                                <span className="text-blue-500">例: 0〜100に設定すると、値50は中心に表示されます。</span>
                                            </p>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 mb-1">最小値 (0%)</label>
                                                    <input
                                                        type="number"
                                                        value={editForm.minVal}
                                                        onChange={e => setEditForm({ ...editForm, minVal: parseFloat(e.target.value) })}
                                                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 mb-1">最大値 (100%)</label>
                                                    <input
                                                        type="number"
                                                        value={editForm.maxVal}
                                                        onChange={e => setEditForm({ ...editForm, maxVal: parseFloat(e.target.value) })}
                                                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Medical Safe Range Settings */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="p-1.5 bg-teal-50 rounded text-teal-600">
                                                <AlertCircle className="w-4 h-4" />
                                            </div>
                                            <h3 className="font-bold text-slate-700">適正範囲（基準値）</h3>
                                        </div>
                                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-4">
                                            <p className="text-xs text-slate-500 mb-2 leading-relaxed">
                                                医学的な正常範囲を入力します。<br />
                                                <span className="text-teal-600">グラフ上で適正エリアとして強調表示されます。</span>
                                            </p>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 mb-1">基準値 下限</label>
                                                    <input
                                                        type="number"
                                                        value={editForm.safeMin ?? ''}
                                                        onChange={e => setEditForm({ ...editForm, safeMin: e.target.value ? parseFloat(e.target.value) : null })}
                                                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                                        placeholder="未設定"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 mb-1">基準値 上限</label>
                                                    <input
                                                        type="number"
                                                        value={editForm.safeMax ?? ''}
                                                        onChange={e => setEditForm({ ...editForm, safeMax: e.target.value ? parseFloat(e.target.value) : null })}
                                                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                                        placeholder="未設定"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Tags */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="p-1.5 bg-purple-50 rounded text-purple-600">
                                            <Tags className="w-4 h-4" />
                                        </div>
                                        <h3 className="font-bold text-slate-700">タグ設定</h3>
                                    </div>
                                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                                        <p className="text-xs text-slate-500 mb-3">
                                            検索用のキーワードを設定します（カンマ区切り）。例: 肝臓, 代謝, 糖尿病
                                        </p>
                                        <input
                                            type="text"
                                            value={editForm.tags.join(', ')}
                                            onChange={e => setEditForm({ ...editForm, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                                            className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                                            placeholder="肝臓, 腎臓, 脂質..."
                                        />
                                        <div className="flex gap-2 flex-wrap mt-3">
                                            {editForm.tags.map((tag, idx) => (
                                                <span key={idx} className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold border border-purple-200">
                                                    #{tag}
                                                </span>
                                            ))}
                                            {editForm.tags.length === 0 && <span className="text-slate-400 text-xs italic">タグなし</span>}
                                        </div>
                                    </div>
                                </div>

                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                <Settings className="w-16 h-16 mb-4 opacity-20" />
                                <p className="font-medium text-slate-400">左側のリストから設定したい項目を選択してください</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
