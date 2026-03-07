'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, X, Check, Edit2, Trash2, ChevronLeft, ChevronRight, GripVertical } from 'lucide-react';
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
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
    '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
];

const UNITS = ['回', '時間', '分', 'km', 'ページ', '杯'];

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

export default function HabitsClient() {
    const [habits, setHabits] = useState<Habit[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentMonth, setCurrentMonth] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });
    const [showAddModal, setShowAddModal] = useState(false);
    const [editModalHabit, setEditModalHabit] = useState<Habit | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
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

    // 並び替え状態
    const [isReordering, setIsReordering] = useState(false);
    const [reorderHabits, setReorderHabits] = useState<Habit[]>([]);
    const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

    // 横スクロール用ref
    const scrollRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());
    const headerScrollRef = useRef<HTMLDivElement>(null);
    const isSyncing = useRef(false);

    // 今日の日付
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // 月の全日付を取得
    const getMonthDates = useCallback((monthDate: Date) => {
        const year = monthDate.getFullYear();
        const month = monthDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const dates: Date[] = [];
        for (let d = 1; d <= daysInMonth; d++) {
            dates.push(new Date(year, month, d));
        }
        return dates;
    }, []);

    const monthDates = getMonthDates(currentMonth);

    // 全スクロール要素を同期する関数
    const syncAllScrolls = useCallback((scrollLeft: number, sourceId?: string) => {
        if (isSyncing.current) return;
        isSyncing.current = true;
        if (headerScrollRef.current && sourceId !== '__header__') {
            headerScrollRef.current.scrollLeft = scrollLeft;
        }
        scrollRefsMap.current.forEach((el, id) => {
            if (id !== sourceId) {
                el.scrollLeft = scrollLeft;
            }
        });
        requestAnimationFrame(() => { isSyncing.current = false; });
    }, []);

    // 今日を右から2番目に表示するスクロール位置を計算
    useEffect(() => {
        const headerContainer = headerScrollRef.current;
        const firstRow = scrollRefsMap.current.values().next().value as HTMLDivElement | undefined;
        if (!headerContainer) return;

        const todayInMonth = today.getFullYear() === currentMonth.getFullYear()
            && today.getMonth() === currentMonth.getMonth();

        if (todayInMonth) {
            const todayIndex = today.getDate() - 1;
            const cellWidth = 40;
            const containerWidth = firstRow?.clientWidth || headerContainer.clientWidth;
            const scrollPos = Math.max(0, (todayIndex * cellWidth) - containerWidth + cellWidth * 2);
            syncAllScrolls(scrollPos);
        } else {
            syncAllScrolls(0);
        }
    }, [currentMonth, loading, syncAllScrolls]);

    // ヘッダーとボディのスクロール同期
    const handleRowScroll = (habitId: string) => {
        const el = scrollRefsMap.current.get(habitId);
        if (el) syncAllScrolls(el.scrollLeft, habitId);
    };

    const handleHeaderScroll = () => {
        if (headerScrollRef.current) {
            syncAllScrolls(headerScrollRef.current.scrollLeft, '__header__');
        }
    };

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

    // 習慣を更新（モーダルから）
    const handleUpdateHabitFromModal = async () => {
        if (!editModalHabit) return;
        try {
            const res = await fetch(`/api/habits/${editModalHabit.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editModalHabit.name,
                    type: editModalHabit.type,
                    unit: editModalHabit.type === 'numeric' ? editModalHabit.unit : null,
                    color: editModalHabit.color,
                }),
            });
            if (res.ok) {
                await fetchHabits();
                setEditModalHabit(null);
                setIsEditMode(false);
            }
        } catch (error) {
            console.error('Error updating habit:', error);
        }
    };

    // 習慣を削除
    const handleDeleteHabit = async (habitId: string) => {
        if (!confirm('この習慣を削除しますか？記録もすべて削除されます。')) return;
        try {
            const res = await fetch(`/api/habits/${habitId}`, { method: 'DELETE' });
            if (res.ok) {
                await fetchHabits();
                setEditModalHabit(null);
                setIsEditMode(false);
            }
        } catch (error) {
            console.error('Error deleting habit:', error);
        }
    };

    // 記録を更新（楽観的UI）
    const handleRecordUpdate = async (habitId: string, date: Date, value: number | null) => {
        const dateStr = date.toISOString().split('T')[0];
        setHabits(prevHabits =>
            prevHabits.map(habit => {
                if (habit.id !== habitId) return habit;
                const existingRecordIndex = habit.records.findIndex(r => {
                    return new Date(r.date).toISOString().split('T')[0] === dateStr;
                });
                let updatedRecords = [...habit.records];
                if (existingRecordIndex !== -1) {
                    updatedRecords[existingRecordIndex] = { ...updatedRecords[existingRecordIndex], value };
                } else {
                    updatedRecords.push({ id: `temp-${Date.now()}`, habitId, date, value });
                }
                return { ...habit, records: updatedRecords };
            })
        );
        try {
            const res = await fetch(`/api/habits/${habitId}/records`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ date: dateStr, value }),
            });
            if (!res.ok) await fetchHabits();
        } catch {
            await fetchHabits();
        }
    };

    // 日付の記録を取得
    const getRecordForDate = (habit: Habit, date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        return habit.records?.find(r => new Date(r.date).toISOString().split('T')[0] === dateStr);
    };

    // === 並び替え関連 ===
    const startReorder = () => {
        setIsReordering(true);
        setReorderHabits([...habits]);
    };

    const handleReorderLongPressStart = (index: number) => {
        longPressTimerRef.current = setTimeout(() => {
            setDraggingIndex(index);
            // 触覚フィードバック
            if (navigator.vibrate) navigator.vibrate(50);
        }, 300);
    };

    const handleReorderLongPressEnd = () => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    };

    const moveItem = (fromIndex: number, toIndex: number) => {
        if (toIndex < 0 || toIndex >= reorderHabits.length) return;
        const updated = [...reorderHabits];
        const [moved] = updated.splice(fromIndex, 1);
        updated.splice(toIndex, 0, moved);
        setReorderHabits(updated);
        setDraggingIndex(toIndex);
    };

    const saveReorder = async () => {
        const habitIds = reorderHabits.map(h => h.id);
        setHabits(reorderHabits);
        setIsReordering(false);
        setDraggingIndex(null);
        try {
            await fetch('/api/habits', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ habitIds }),
            });
        } catch (error) {
            console.error('Error saving order:', error);
            await fetchHabits();
        }
    };

    const cancelReorder = () => {
        setIsReordering(false);
        setReorderHabits([]);
        setDraggingIndex(null);
    };

    // 月の表示文字列
    const monthLabel = `${currentMonth.getFullYear()}年${currentMonth.getMonth() + 1}月`;

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
                        {/* 編集ボタン */}
                        {habits.length > 0 && !isReordering && (
                            <button
                                onClick={() => setIsEditMode(!isEditMode)}
                                className={`px-3 sm:px-4 py-2 rounded-lg transition flex items-center gap-2 text-sm h-10 ${
                                    isEditMode
                                        ? 'bg-amber-500 text-white hover:bg-amber-600'
                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                                }`}
                            >
                                <Edit2 className="w-4 h-4" />
                                <span className="hidden sm:inline">{isEditMode ? '完了' : '編集'}</span>
                            </button>
                        )}
                        {/* 追加ボタン */}
                        {!isReordering && (
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="px-3 sm:px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-lg hover:from-teal-600 hover:to-emerald-600 transition flex items-center gap-2 shadow-md text-sm h-10"
                            >
                                <Plus className="w-4 h-4" />
                                <span className="hidden sm:inline">新しい習慣</span>
                                <span className="sm:hidden">追加</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* 並び替えモード */}
                {isReordering ? (
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 mb-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">並び替え</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={cancelReorder}
                                    className="px-3 py-1.5 text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                                >
                                    キャンセル
                                </button>
                                <button
                                    onClick={saveReorder}
                                    className="px-3 py-1.5 text-xs bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition"
                                >
                                    保存
                                </button>
                            </div>
                        </div>
                        <div className="space-y-1">
                            {reorderHabits.map((habit, index) => (
                                <div
                                    key={habit.id}
                                    className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                                        draggingIndex === index
                                            ? 'bg-teal-50 dark:bg-teal-900/30 shadow-md scale-[1.02]'
                                            : 'bg-slate-50 dark:bg-slate-900/50'
                                    }`}
                                    style={{ borderLeft: `4px solid ${habit.color}` }}
                                >
                                    <div className="flex flex-col gap-0.5">
                                        <button
                                            onClick={() => moveItem(index, index - 1)}
                                            disabled={index === 0}
                                            className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 transition"
                                        >
                                            <ChevronLeft className="w-4 h-4 text-slate-500 rotate-90" />
                                        </button>
                                        <button
                                            onClick={() => moveItem(index, index + 1)}
                                            disabled={index === reorderHabits.length - 1}
                                            className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 transition"
                                        >
                                            <ChevronRight className="w-4 h-4 text-slate-500 rotate-90" />
                                        </button>
                                    </div>
                                    <GripVertical className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                    <span className="text-sm font-medium text-slate-800 dark:text-white flex-1">
                                        {habit.name}
                                    </span>
                                    <span className="text-xs text-slate-400">{index + 1}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* メインコンテンツ: 月切り替え + 横スクロール週表示 */
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-3 sm:p-4 mb-4">
                        {/* 月ナビゲーション */}
                        <div className="flex items-center justify-between mb-3">
                            <button
                                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                            >
                                <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                            </button>
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                {monthLabel}
                            </span>
                            <button
                                onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                            >
                                <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                            </button>
                        </div>

                        {/* 日付ヘッダー（横スクロール同期） */}
                        <div className="flex">
                            <div className="w-24 flex-shrink-0" />
                            <div
                                ref={headerScrollRef}
                                className="flex-1 overflow-x-auto scrollbar-hide"
                                onScroll={handleHeaderScroll}
                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                            >
                                <div className="flex" style={{ width: `${monthDates.length * 40}px` }}>
                                    {monthDates.map((date, index) => {
                                        const isToday = date.toISOString().split('T')[0] === todayStr;
                                        const isSunday = date.getDay() === 0;
                                        const isSaturday = date.getDay() === 6;
                                        return (
                                            <div
                                                key={index}
                                                className={`w-10 flex-shrink-0 text-center text-[10px] leading-tight py-1 ${
                                                    isToday
                                                        ? 'font-bold text-teal-600 dark:text-teal-400'
                                                        : isSunday
                                                            ? 'text-red-400'
                                                            : isSaturday
                                                                ? 'text-blue-400'
                                                                : 'text-slate-500 dark:text-slate-400'
                                                }`}
                                            >
                                                <div>{DAY_LABELS[date.getDay()]}</div>
                                                <div className={`text-xs ${isToday ? 'bg-teal-500 text-white rounded-full w-5 h-5 flex items-center justify-center mx-auto' : ''}`}>
                                                    {date.getDate()}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
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
                                        className={`flex items-center rounded-lg p-1.5 group ${
                                            isEditMode ? 'bg-amber-50 dark:bg-amber-900/10 cursor-pointer' : 'bg-slate-50 dark:bg-slate-900/50'
                                        }`}
                                        style={{ borderLeft: `4px solid ${habit.color}` }}
                                        onClick={isEditMode ? () => { setEditModalHabit(habit); } : undefined}
                                        onTouchStart={!isEditMode && !isReordering ? () => {
                                            longPressTimerRef.current = setTimeout(() => {
                                                startReorder();
                                                if (navigator.vibrate) navigator.vibrate(50);
                                            }, 500);
                                        } : undefined}
                                        onTouchEnd={!isEditMode && !isReordering ? () => {
                                            if (longPressTimerRef.current) {
                                                clearTimeout(longPressTimerRef.current);
                                                longPressTimerRef.current = null;
                                            }
                                        } : undefined}
                                        onTouchMove={!isEditMode && !isReordering ? () => {
                                            if (longPressTimerRef.current) {
                                                clearTimeout(longPressTimerRef.current);
                                                longPressTimerRef.current = null;
                                            }
                                        } : undefined}
                                    >
                                        {/* 習慣名 */}
                                        <div className="flex items-center gap-1 w-24 flex-shrink-0 pr-1">
                                            {isEditMode && (
                                                <Edit2 className="w-3 h-3 text-amber-500 flex-shrink-0" />
                                            )}
                                            <span className="text-xs font-medium text-slate-800 dark:text-white leading-tight break-words line-clamp-2 flex-1 select-none">
                                                {habit.name}
                                            </span>
                                        </div>

                                        {/* 横スクロール記録 */}
                                        {!isEditMode && (
                                            <div
                                                ref={(el) => {
                                                    if (el) scrollRefsMap.current.set(habit.id, el);
                                                    else scrollRefsMap.current.delete(habit.id);
                                                }}
                                                className="flex-1 overflow-x-auto scrollbar-hide"
                                                onScroll={() => handleRowScroll(habit.id)}
                                                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                            >
                                                <div className="flex" style={{ width: `${monthDates.length * 40}px` }}>
                                                    {monthDates.map((date, index) => {
                                                        const record = getRecordForDate(habit, date);
                                                        const isToday = date.toISOString().split('T')[0] === todayStr;
                                                        return (
                                                            <div key={index} className="w-10 flex-shrink-0 flex justify-center">
                                                                {habit.type === 'yes_no' ? (
                                                                    <button
                                                                        onClick={() =>
                                                                            handleRecordUpdate(habit.id, date, record?.value === 1 ? 0 : 1)
                                                                        }
                                                                        className="w-7 h-7 rounded-md transition flex items-center justify-center bg-transparent"
                                                                    >
                                                                        {record?.value === 1 ? (
                                                                            <Check className="w-4 h-4" style={{ color: habit.color }} />
                                                                        ) : (
                                                                            <X className="w-4 h-4 text-slate-300 dark:text-slate-600" />
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
                                                                        className="w-10 h-7 flex flex-col items-center justify-center leading-none"
                                                                    >
                                                                        <span
                                                                            className={`text-xs font-medium leading-none ${!record?.value && 'text-slate-400 dark:text-slate-500'}`}
                                                                            style={record?.value ? { color: habit.color } : {}}
                                                                        >
                                                                            {record?.value ?? '-'}
                                                                        </span>
                                                                        {habit.unit && (
                                                                            <span
                                                                                className={`text-[8px] leading-none mt-0.5 ${!record?.value && 'text-slate-400 dark:text-slate-500'}`}
                                                                                style={record?.value ? { color: habit.color } : {}}
                                                                            >
                                                                                {habit.unit}
                                                                            </span>
                                                                        )}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 編集モードのヒント */}
                        {isEditMode && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 text-center mt-3">
                                編集したい項目をタップしてください
                            </p>
                        )}

                        {/* 長押しヒント */}
                        {!isEditMode && habits.length > 1 && (
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center mt-2">
                                長押しで並び替え
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* 数値入力モーダル */}
            {numericInputModal && (
                <div className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center z-50 p-4 pt-20 sm:pt-4 overflow-y-auto">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-sm w-full p-6 mb-auto sm:mb-0">
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
                                {DAY_LABELS[numericInputModal.date.getDay()]})
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
                                        handleRecordUpdate(numericInputModal.habit.id, numericInputModal.date, value);
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
                                    handleRecordUpdate(numericInputModal.habit.id, numericInputModal.date, value);
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

            {/* 編集モーダル */}
            {editModalHabit && (
                <div className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center z-50 p-4 pt-12 sm:pt-4 overflow-y-auto">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto mb-auto sm:mb-0">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">習慣を編集</h3>
                            <button
                                onClick={() => { setEditModalHabit(null); }}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                            >
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">習慣名</label>
                                <input
                                    type="text"
                                    value={editModalHabit.name}
                                    onChange={(e) => setEditModalHabit({ ...editModalHabit, name: e.target.value })}
                                    placeholder="例: 運動、読書、瞑想"
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">タイプ</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setEditModalHabit({ ...editModalHabit, type: 'yes_no' })}
                                        className={`py-2 px-4 rounded-lg transition ${
                                            editModalHabit.type === 'yes_no'
                                                ? 'bg-teal-500 text-white'
                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        Yes/No
                                    </button>
                                    <button
                                        onClick={() => setEditModalHabit({ ...editModalHabit, type: 'numeric' })}
                                        className={`py-2 px-4 rounded-lg transition ${
                                            editModalHabit.type === 'numeric'
                                                ? 'bg-teal-500 text-white'
                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        数値
                                    </button>
                                </div>
                            </div>
                            {editModalHabit.type === 'numeric' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">単位</label>
                                    <select
                                        value={editModalHabit.unit || '回'}
                                        onChange={(e) => setEditModalHabit({ ...editModalHabit, unit: e.target.value })}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white"
                                    >
                                        {UNITS.map((unit) => (
                                            <option key={unit} value={unit}>{unit}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">色</label>
                                <div className="grid grid-cols-8 gap-2">
                                    {COLORS.map((color) => (
                                        <button
                                            key={color}
                                            onClick={() => setEditModalHabit({ ...editModalHabit, color })}
                                            className={`w-full aspect-square rounded-lg transition ${
                                                editModalHabit.color === color
                                                    ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-slate-500'
                                                    : ''
                                            }`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={handleUpdateHabitFromModal}
                                    className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-white rounded-lg hover:from-teal-600 hover:to-emerald-600 transition font-medium"
                                >
                                    保存
                                </button>
                                <button
                                    onClick={() => handleDeleteHabit(editModalHabit.id)}
                                    className="px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium flex items-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    削除
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 新規追加モーダル */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center z-50 p-4 pt-12 sm:pt-4 overflow-y-auto">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto mb-auto sm:mb-0">
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
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">習慣名</label>
                                <input
                                    type="text"
                                    value={newHabit.name}
                                    onChange={(e) => setNewHabit({ ...newHabit, name: e.target.value })}
                                    placeholder="例: 運動、読書、瞑想"
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">タイプ</label>
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
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">単位</label>
                                    <select
                                        value={newHabit.unit}
                                        onChange={(e) => setNewHabit({ ...newHabit, unit: e.target.value })}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-800 dark:text-white"
                                    >
                                        {UNITS.map((unit) => (
                                            <option key={unit} value={unit}>{unit}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">色</label>
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

            {/* scrollbar-hide用のスタイル */}
            <style jsx global>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </div>
    );
}
