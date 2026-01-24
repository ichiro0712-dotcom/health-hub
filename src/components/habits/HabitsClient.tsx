'use client';

import { useState, useEffect } from 'react';
import { Plus, X, Check, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import Header from '@/components/Header';
import ExportDataButton from '@/components/ExportDataButton';

interface Habit {
    id: string;
    name: string;
    type: 'yes_no' | 'numeric';
    unit: string | null;
    color: string;
    order: number;
    records: HabitRecord[];
}

interface HabitRecord {
    id: string;
    habitId: string;
    date: Date;
    value: number | null;
}

const COLORS = [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#F97316', // Orange
];

const UNITS = ['回', '時間', '分', 'km', 'ページ', '杯'];

export default function HabitsClient() {
    const [habits, setHabits] = useState<Habit[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
    const [numericInputModal, setNumericInputModal] = useState<{
        habit: Habit;
        date: Date;
        currentValue: number | null;
    } | null>(null);
    const [newHabit, setNewHabit] = useState({
        name: '',
        type: 'yes_no' as 'yes_no' | 'numeric',
        unit: '回',
        color: COLORS[0],
    });

    // 今週の日付を取得
    const getWeekDates = (date: Date) => {
        const start = new Date(date);
        start.setDate(start.getDate() - start.getDay()); // 日曜日
        const dates = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            dates.push(d);
        }
        return dates;
    };

    const weekDates = getWeekDates(currentDate);

    // 習慣一覧を取得
    const fetchHabits = async () => {
        try {
            const res = await fetch('/api/habits');
            if (res.ok) {
                const data = await res.json();
                setHabits(data.habits || []);
            }
        } catch (error) {
            console.error('Error fetching habits:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHabits();
    }, []);

    // 習慣を追加
    const handleAddHabit = async () => {
        if (!newHabit.name.trim()) return;

        try {
            const res = await fetch('/api/habits', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newHabit.name,
                    type: newHabit.type,
                    unit: newHabit.type === 'numeric' ? newHabit.unit : null,
                    color: newHabit.color,
                }),
            });

            if (res.ok) {
                await fetchHabits();
                setShowAddModal(false);
                setNewHabit({ name: '', type: 'yes_no', unit: '回', color: COLORS[0] });
            }
        } catch (error) {
            console.error('Error adding habit:', error);
        }
    };

    // 習慣を更新
    const handleUpdateHabit = async (habitId: string) => {
        if (!editingHabit) return;

        try {
            const res = await fetch(`/api/habits/${habitId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editingHabit.name,
                    color: editingHabit.color,
                }),
            });

            if (res.ok) {
                await fetchHabits();
                setEditingHabit(null);
            }
        } catch (error) {
            console.error('Error updating habit:', error);
        }
    };

    // 習慣を削除
    const handleDeleteHabit = async (habitId: string) => {
        if (!confirm('この習慣を削除しますか？記録もすべて削除されます。')) return;

        try {
            const res = await fetch(`/api/habits/${habitId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                await fetchHabits();
            }
        } catch (error) {
            console.error('Error deleting habit:', error);
        }
    };

    // 記録を更新（楽観的UI）
    const handleRecordUpdate = async (habitId: string, date: Date, value: number | null) => {
        const dateStr = date.toISOString().split('T')[0];

        // 楽観的UI: 即座にローカルステートを更新
        setHabits(prevHabits =>
            prevHabits.map(habit => {
                if (habit.id !== habitId) return habit;

                const existingRecordIndex = habit.records.findIndex(r => {
                    const recordDateStr = new Date(r.date).toISOString().split('T')[0];
                    return recordDateStr === dateStr;
                });

                let updatedRecords = [...habit.records];

                if (existingRecordIndex !== -1) {
                    // 既存の記録を更新
                    updatedRecords[existingRecordIndex] = {
                        ...updatedRecords[existingRecordIndex],
                        value,
                    };
                } else {
                    // 新しい記録を追加
                    updatedRecords.push({
                        id: `temp-${Date.now()}`, // 一時ID
                        habitId,
                        date,
                        value,
                    });
                }

                return {
                    ...habit,
                    records: updatedRecords,
                };
            })
        );

        // バックグラウンドでAPIを呼び出し
        try {
            const res = await fetch(`/api/habits/${habitId}/records`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: dateStr,
                    value,
                }),
            });

            if (!res.ok) {
                // エラーの場合、データを再取得してロールバック
                console.error('Record update failed, rolling back...');
                await fetchHabits();
            }
        } catch (error) {
            console.error('Error updating record:', error);
            // エラーの場合、データを再取得してロールバック
            await fetchHabits();
        }
    };

    // 日付の記録を取得
    const getRecordForDate = (habit: Habit, date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        return habit.records?.find((r) => {
            const recordDateStr = new Date(r.date).toISOString().split('T')[0];
            return recordDateStr === dateStr;
        });
    };


    if (loading) {
        return (
            <div className="min-h-screen pb-24 md:pb-8 bg-slate-50 dark:bg-slate-900">
                <Header />
                <div className="flex items-center justify-center h-64">
                    <div className="text-slate-500">読み込み中...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-24 md:pb-8 bg-slate-50 dark:bg-slate-900">
            <Header />

            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* ヘッダー */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white">習慣</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm hidden sm:block">毎日の習慣を記録して、継続をサポート</p>
                    </div>
                    <div className="flex gap-2">
                        <ExportDataButton habits={habits} showRecords={false} showHabits={true} />
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="px-3 sm:px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-lg hover:from-teal-600 hover:to-emerald-600 transition flex items-center gap-2 shadow-md text-sm h-10"
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">新しい習慣</span>
                            <span className="sm:hidden">追加</span>
                        </button>
                    </div>
                </div>

                {/* 週ナビゲーション */}
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-3 sm:p-6 mb-4">
                    {/* 週の曜日ヘッダー */}
                    <div className="flex items-center mb-2 text-xs text-slate-500 dark:text-slate-400">
                        <div className="w-28 flex-shrink-0 flex items-center gap-1">
                            <button
                                onClick={() => {
                                    const prev = new Date(currentDate);
                                    prev.setDate(prev.getDate() - 7);
                                    setCurrentDate(prev);
                                }}
                                className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition"
                            >
                                <ChevronLeft className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                            </button>
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                {weekDates[0].getFullYear()}:{weekDates[0].getMonth() + 1}/{weekDates[0].getDate()}-{weekDates[6].getMonth() + 1}/{weekDates[6].getDate()}
                            </span>
                            <button
                                onClick={() => {
                                    const next = new Date(currentDate);
                                    next.setDate(next.getDate() + 7);
                                    setCurrentDate(next);
                                }}
                                className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition"
                            >
                                <ChevronRight className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                            </button>
                        </div>
                        <div className="flex-1 flex text-center">
                            {weekDates.map((date, index) => {
                                const isToday = date.toDateString() === new Date().toDateString();
                                return (
                                    <div key={index} className={`flex-1 ${isToday ? 'font-bold text-teal-600 dark:text-teal-400' : ''}`}>
                                        {['日', '月', '火', '水', '木', '金', '土'][date.getDay()]}
                                        <div className="text-[10px]">{date.getDate()}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* 習慣リスト */}
                    {habits.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                            習慣が登録されていません。「追加」ボタンから登録してください。
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {habits.map((habit) => (
                                <div
                                    key={habit.id}
                                    className="flex items-center bg-slate-50 dark:bg-slate-900/50 rounded-lg p-2 group"
                                    style={{ borderLeft: `4px solid ${habit.color}` }}
                                >
                                    {/* 習慣名 - 固定幅112px (30%短縮) */}
                                    <div className="flex items-center gap-1 w-28 flex-shrink-0 pr-2">
                                        {editingHabit?.id === habit.id ? (
                                            <>
                                                <input
                                                    type="text"
                                                    value={editingHabit.name}
                                                    onChange={(e) =>
                                                        setEditingHabit({ ...editingHabit, name: e.target.value })
                                                    }
                                                    className="px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-xs w-full"
                                                />
                                                <button
                                                    onClick={() => handleUpdateHabit(habit.id)}
                                                    className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded flex-shrink-0"
                                                >
                                                    <Check className="w-3 h-3" />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-white leading-tight break-words line-clamp-2 flex-1">
                                                    {habit.name}
                                                </span>
                                                <button
                                                    onClick={() => setEditingHabit(habit)}
                                                    className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 opacity-0 group-hover:opacity-100 flex-shrink-0"
                                                >
                                                    <Edit2 className="w-2.5 h-2.5" />
                                                </button>
                                            </>
                                        )}
                                    </div>

                                    {/* 週間記録 - 均等配置 */}
                                    <div className="flex-1 flex">
                                        {weekDates.map((date, index) => {
                                            const record = getRecordForDate(habit, date);
                                            const isToday = date.toDateString() === new Date().toDateString();

                                            return (
                                                <div key={index} className="flex-1 flex justify-center">
                                                    {habit.type === 'yes_no' ? (
                                                        <button
                                                            onClick={() =>
                                                                handleRecordUpdate(
                                                                    habit.id,
                                                                    date,
                                                                    record?.value === 1 ? 0 : 1
                                                                )
                                                            }
                                                            className="w-6 h-6 rounded-md transition flex items-center justify-center bg-transparent"
                                                        >
                                                            {record?.value === 1 ? (
                                                                <Check className="w-4 h-4" style={{ color: habit.color }} />
                                                            ) : (
                                                                <X className="w-4 h-4 text-slate-400 dark:text-slate-600" />
                                                            )}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() =>
                                                                setNumericInputModal({
                                                                    habit,
                                                                    date,
                                                                    currentValue: record?.value ?? null,
                                                                })
                                                            }
                                                            className="flex flex-col items-center justify-center min-w-[2.5rem] leading-tight"
                                                        >
                                                            <span
                                                                className={`text-sm font-medium ${!record?.value && 'text-slate-400 dark:text-slate-500'}`}
                                                                style={record?.value ? { color: habit.color } : {}}
                                                            >
                                                                {record?.value ?? 0}
                                                            </span>
                                                            <span
                                                                className={`text-[10px] ${!record?.value && 'text-slate-400 dark:text-slate-500'}`}
                                                                style={record?.value ? { color: habit.color } : {}}
                                                            >
                                                                {habit.unit || ''}
                                                            </span>
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* 数値入力モーダル */}
            {numericInputModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-sm w-full p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                                {numericInputModal.habit.name}
                            </h3>
                            <button
                                onClick={() => setNumericInputModal(null)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                            >
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        <div className="mb-4">
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                                {numericInputModal.date.getMonth() + 1}月{numericInputModal.date.getDate()}日 (
                                {['日', '月', '火', '水', '木', '金', '土'][numericInputModal.date.getDay()]})
                            </p>
                            <input
                                type="number"
                                step="0.5"
                                defaultValue={numericInputModal.currentValue ?? ''}
                                placeholder="0"
                                className="w-full px-4 py-3 bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white text-lg text-center"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        const value = (e.target as HTMLInputElement).value
                                            ? parseFloat((e.target as HTMLInputElement).value)
                                            : null;
                                        handleRecordUpdate(
                                            numericInputModal.habit.id,
                                            numericInputModal.date,
                                            value
                                        );
                                        setNumericInputModal(null);
                                    }
                                }}
                                id="numeric-input"
                            />
                            {numericInputModal.habit.unit && (
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 text-center">
                                    単位: {numericInputModal.habit.unit}
                                </p>
                            )}
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => setNumericInputModal(null)}
                                className="flex-1 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={() => {
                                    const input = document.getElementById('numeric-input') as HTMLInputElement;
                                    const value = input.value ? parseFloat(input.value) : null;
                                    handleRecordUpdate(
                                        numericInputModal.habit.id,
                                        numericInputModal.date,
                                        value
                                    );
                                    setNumericInputModal(null);
                                }}
                                className="flex-1 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-lg hover:from-teal-600 hover:to-emerald-600 transition"
                            >
                                保存
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 新規追加モーダル */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">新しい習慣</h3>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                            >
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    習慣名
                                </label>
                                <input
                                    type="text"
                                    value={newHabit.name}
                                    onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
                                    placeholder="例: 運動、読書、瞑想"
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    タイプ
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setNewHabit({ ...newHabit, type: 'yes_no' })}
                                        className={`py-2 px-4 rounded-lg transition ${
                                            newHabit.type === 'yes_no'
                                                ? 'bg-teal-500 text-white'
                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        Yes/No
                                    </button>
                                    <button
                                        onClick={() => setNewHabit({ ...newHabit, type: 'numeric' })}
                                        className={`py-2 px-4 rounded-lg transition ${
                                            newHabit.type === 'numeric'
                                                ? 'bg-teal-500 text-white'
                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        数値
                                    </button>
                                </div>
                            </div>

                            {newHabit.type === 'numeric' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        単位
                                    </label>
                                    <select
                                        value={newHabit.unit}
                                        onChange={(e) => setNewHabit({ ...newHabit, unit: e.target.value })}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white"
                                    >
                                        {UNITS.map((unit) => (
                                            <option key={unit} value={unit}>
                                                {unit}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    色
                                </label>
                                <div className="grid grid-cols-8 gap-2">
                                    {COLORS.map((color) => (
                                        <button
                                            key={color}
                                            onClick={() => setNewHabit({ ...newHabit, color })}
                                            className={`w-full aspect-square rounded-lg transition ${
                                                newHabit.color === color
                                                    ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-slate-500'
                                                    : ''
                                            }`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={handleAddHabit}
                                className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-lg hover:from-teal-600 hover:to-emerald-600 transition font-medium"
                            >
                                追加
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
