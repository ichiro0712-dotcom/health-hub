'use client';

import { useState, useEffect, useMemo } from 'react';
import { getTrendsData, TrendRecord } from "@/app/actions/trends"; // Use unified data action
import { getUserItemSettings } from '@/app/actions/settings';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea
} from 'recharts';
import {
    Table, TrendingUp, Calendar, Search, Filter, Plus, X, Settings as SettingsIcon,
    ChevronDown, ChevronRight, ArrowUpRight, ArrowDownRight, Minus, AlertCircle, Smartphone, Building2,
    ChevronLeft, CalendarDays, Info
} from 'lucide-react';
import Link from 'next/link';
import Header from '@/components/Header';
import { toast } from 'sonner';
import { Copy } from 'lucide-react';
import { DEFAULT_ITEM_SETTINGS } from '@/constants/health-items';
import { compareItemsByCategory } from '@/lib/master-data/jlac10-subset';

type TimeRange = 'day' | 'week' | 'month' | 'year' | 'custom';

interface ItemSetting {
    itemName: string;
    minVal: number;
    maxVal: number;
    safeMin?: number | null;
    safeMax?: number | null;
    tags: string[];
    description?: string;
}

export default function TrendsPage() {
    const [viewMode, setViewMode] = useState<'table' | 'graph'>('table');
    const [listTab, setListTab] = useState<'hospital' | 'smartphone'>('hospital'); // New Tab State
    const [records, setRecords] = useState<TrendRecord[]>([]);
    const [settings, setSettings] = useState<Record<string, ItemSetting>>({});
    const [isLoading, setIsLoading] = useState(true);

    // Graph State
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);

    // Copy Menu State
    const [showCopyMenu, setShowCopyMenu] = useState(false);

    // Time Range State for Smartphone Data
    const [timeRange, setTimeRange] = useState<TimeRange>('day');
    const [currentPeriod, setCurrentPeriod] = useState<Date>(new Date());
    const [customStartDate, setCustomStartDate] = useState<string>('');
    const [customEndDate, setCustomEndDate] = useState<string>('');
    const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            const [trendsRes, settingsRes] = await Promise.all([
                getTrendsData(),
                getUserItemSettings()
            ]);

            if (trendsRes.success && trendsRes.records) {
                setRecords(trendsRes.records);

                // Set initial graph selection
                // Prioritize finding weight/steps/hba1c
                const allKeys = trendsRes.availableKeys || [];
                const initialSelection = [];
                if (allKeys.includes('体重')) initialSelection.push('体重');
                if (allKeys.includes('HbA1c')) initialSelection.push('HbA1c');
                if (initialSelection.length === 0) {
                    initialSelection.push(...allKeys.slice(0, 3));
                }
                setSelectedItems(initialSelection);
            } else {
                toast.error('データの取得に失敗しました');
            }

            if (settingsRes.success && settingsRes.data) {
                const sMap: Record<string, ItemSetting> = {};
                // Load defaults first
                Object.entries(DEFAULT_ITEM_SETTINGS).forEach(([key, val]) => {
                    sMap[key] = { itemName: key, ...val };
                });
                // Merge with user settings
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

    // Helper: Get all unique items from RECORDS (sorted by category)
    const allItems = Array.from(new Set(records.flatMap(r => Object.keys(r.items)))).sort(compareItemsByCategory);

    // Helper: Filter items for search
    const filteredItems = allItems.filter(item => {
        const lowerQ = searchQuery.toLowerCase();
        const setting = settings[item];
        return item.toLowerCase().includes(lowerQ) ||
            setting?.tags.some(t => t.toLowerCase().includes(lowerQ));
    });

    // Helper: Normalize value for graph (0-100)
    const normalizeValue = (item: string, value: number) => {
        const setting = settings[item];
        const min = setting?.minVal ?? 0;
        const max = setting?.maxVal ?? 100;
        if (max === min) return 50;
        return ((value - min) / (max - min)) * 100;
    };

    // Helper: Get color for item index
    const COLORS = ['#14b8a6', '#f59e0b', '#8b5cf6', '#ef4444', '#3b82f6', '#10b981'];

    // --- Time Range Helpers ---
    const getDateRange = useMemo(() => {
        const now = currentPeriod;
        let startDate: Date;
        let endDate: Date;

        switch (timeRange) {
            case 'day':
                // Current month
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'week':
                // 3 months
                startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'month':
                // 1 year
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date(now.getFullYear(), 11, 31);
                break;
            case 'year':
                // All time
                startDate = new Date(2000, 0, 1);
                endDate = new Date(2100, 11, 31);
                break;
            case 'custom':
                startDate = customStartDate ? new Date(customStartDate) : new Date(2000, 0, 1);
                endDate = customEndDate ? new Date(customEndDate) : new Date();
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }
        return { startDate, endDate };
    }, [timeRange, currentPeriod, customStartDate, customEndDate]);

    const getPeriodLabel = (): string => {
        const now = currentPeriod;
        switch (timeRange) {
            case 'day':
                return `${now.getFullYear()}年${now.getMonth() + 1}月`;
            case 'week':
                const startMonth = new Date(now.getFullYear(), now.getMonth() - 2, 1);
                return `${startMonth.getFullYear()}年${startMonth.getMonth() + 1}月〜${now.getMonth() + 1}月`;
            case 'month':
                return `${now.getFullYear()}年`;
            case 'year':
                return 'すべての期間';
            case 'custom':
                if (customStartDate && customEndDate) {
                    return `${customStartDate} 〜 ${customEndDate}`;
                }
                return '期間を選択';
            default:
                return '';
        }
    };

    const navigatePeriod = (direction: 'prev' | 'next') => {
        const newPeriod = new Date(currentPeriod);
        switch (timeRange) {
            case 'day':
                newPeriod.setMonth(newPeriod.getMonth() + (direction === 'next' ? 1 : -1));
                break;
            case 'week':
                newPeriod.setMonth(newPeriod.getMonth() + (direction === 'next' ? 3 : -3));
                break;
            case 'month':
                newPeriod.setFullYear(newPeriod.getFullYear() + (direction === 'next' ? 1 : -1));
                break;
            case 'year':
                // No navigation for all time
                return;
        }
        setCurrentPeriod(newPeriod);
    };

    // Group records by week/month/year and calculate averages
    const aggregateRecords = (filteredRecords: TrendRecord[]): TrendRecord[] => {
        if (timeRange === 'day' || timeRange === 'custom') {
            return filteredRecords;
        }

        const groupedData: { [key: string]: { items: { [key: string]: number[] }, dates: string[] } } = {};

        filteredRecords.forEach(record => {
            const date = new Date(record.date);
            let groupKey: string;

            switch (timeRange) {
                case 'week':
                    // Get ISO week number
                    const startOfYear = new Date(date.getFullYear(), 0, 1);
                    const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
                    const weekNum = Math.ceil((days + startOfYear.getDay() + 1) / 7);
                    groupKey = `${date.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
                    break;
                case 'month':
                    groupKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
                    break;
                case 'year':
                    groupKey = `${date.getFullYear()}`;
                    break;
                default:
                    groupKey = record.date;
            }

            if (!groupedData[groupKey]) {
                groupedData[groupKey] = { items: {}, dates: [] };
            }
            groupedData[groupKey].dates.push(record.date);

            Object.entries(record.items).forEach(([key, value]) => {
                if (!groupedData[groupKey].items[key]) {
                    groupedData[groupKey].items[key] = [];
                }
                groupedData[groupKey].items[key].push(value);
            });
        });

        // Calculate averages
        return Object.entries(groupedData)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([groupKey, data]) => {
                const avgItems: { [key: string]: number } = {};
                Object.entries(data.items).forEach(([key, values]) => {
                    const avg = values.reduce((a, b) => a + b, 0) / values.length;
                    avgItems[key] = Math.round(avg * 100) / 100; // Round to 2 decimal places
                });

                let displayDate: string;
                switch (timeRange) {
                    case 'week':
                        displayDate = groupKey; // 2024-W01
                        break;
                    case 'month':
                        displayDate = groupKey.replace('-', '/'); // 2024/01
                        break;
                    case 'year':
                        displayDate = `${groupKey}年`;
                        break;
                    default:
                        displayDate = groupKey;
                }

                return {
                    id: `agg-${groupKey}`,
                    date: displayDate,
                    items: avgItems,
                    images: [],
                    source: 'smartphone' as const
                };
            });
    };

    // --- Table View Render ---
    const renderTableView = () => {
        // Filter records by TAB
        let filteredRecords = records.filter(r => {
            if (listTab === 'hospital') return r.source === 'hospital';
            if (listTab === 'smartphone') return r.source === 'smartphone';
            return true;
        });

        // For smartphone data, apply date range filter and aggregation
        if (listTab === 'smartphone') {
            const { startDate, endDate } = getDateRange;
            filteredRecords = filteredRecords.filter(r => {
                const recordDate = new Date(r.date);
                return recordDate >= startDate && recordDate <= endDate;
            });
            filteredRecords = aggregateRecords(filteredRecords);
        }

        const dates = Array.from(new Set(filteredRecords.map(r => r.date))).sort();
        // Get items specific to this source to avoid empty rows (sorted by category)
        const sourceItems = Array.from(new Set(filteredRecords.flatMap(r => Object.keys(r.items)))).sort(compareItemsByCategory);

        return (
            <div className="space-y-4">
                {/* Tab Switcher */}
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex p-1 bg-slate-100 rounded-lg w-fit">
                        <button
                            onClick={() => setListTab('hospital')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${listTab === 'hospital'
                                ? 'bg-white text-teal-700 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Building2 className="w-4 h-4" />
                            病院データ
                        </button>
                        <button
                            onClick={() => setListTab('smartphone')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${listTab === 'smartphone'
                                ? 'bg-white text-teal-700 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Smartphone className="w-4 h-4" />
                            スマホデータ
                        </button>
                    </div>
                </div>

                {/* Time Range Controls for Smartphone Data */}
                {listTab === 'smartphone' && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
                        {/* Time Range Selector */}
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium text-slate-600 mr-2">表示単位:</span>
                            {(['day', 'week', 'month', 'year', 'custom'] as TimeRange[]).map((range) => (
                                <button
                                    key={range}
                                    onClick={() => {
                                        setTimeRange(range);
                                        if (range === 'custom') {
                                            setShowCustomDatePicker(true);
                                        } else {
                                            setShowCustomDatePicker(false);
                                        }
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                                        timeRange === range
                                            ? 'bg-teal-500 text-white shadow-sm'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    {range === 'day' && '日'}
                                    {range === 'week' && '週'}
                                    {range === 'month' && '月'}
                                    {range === 'year' && '年'}
                                    {range === 'custom' && '期間指定'}
                                </button>
                            ))}
                        </div>

                        {/* Period Navigation */}
                        {timeRange !== 'custom' && (
                            <div className="flex items-center justify-between">
                                <button
                                    onClick={() => navigatePeriod('prev')}
                                    disabled={timeRange === 'year'}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    {timeRange === 'day' && '前月'}
                                    {timeRange === 'week' && '前'}
                                    {timeRange === 'month' && '前年'}
                                    {timeRange === 'year' && ''}
                                </button>
                                <div className="flex items-center gap-2 text-slate-700 font-medium">
                                    <Calendar className="w-4 h-4 text-teal-500" />
                                    <span>{getPeriodLabel()}</span>
                                    {timeRange !== 'day' && timeRange !== 'year' && (
                                        <span className="text-xs text-slate-400 ml-2">(平均値)</span>
                                    )}
                                </div>
                                <button
                                    onClick={() => navigatePeriod('next')}
                                    disabled={timeRange === 'year'}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    {timeRange === 'day' && '翌月'}
                                    {timeRange === 'week' && '次'}
                                    {timeRange === 'month' && '翌年'}
                                    {timeRange === 'year' && ''}
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {/* Custom Date Picker */}
                        {showCustomDatePicker && timeRange === 'custom' && (
                            <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-lg">
                                <CalendarDays className="w-4 h-4 text-teal-500" />
                                <div className="flex items-center gap-2">
                                    <input
                                        type="date"
                                        value={customStartDate}
                                        onChange={(e) => setCustomStartDate(e.target.value)}
                                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                                    />
                                    <span className="text-slate-400">〜</span>
                                    <input
                                        type="date"
                                        value={customEndDate}
                                        onChange={(e) => setCustomEndDate(e.target.value)}
                                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {filteredRecords.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 bg-white rounded-xl border border-slate-200 border-dashed">
                        {listTab === 'hospital' ? '病院の記録がありません' : '選択した期間にスマホデータがありません'}
                    </div>
                ) : (
                    <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-200">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-2.5 font-bold text-slate-800 bg-slate-50 sticky left-0 z-10 border-r border-slate-200 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                                        項目
                                    </th>
                                    {dates.map(date => (
                                        <th key={date} className="px-4 py-2.5 font-medium text-slate-600">
                                            {listTab === 'hospital' ? date.replace(/-/g, '/') : date}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {sourceItems.map((item, idx) => {
                                    const itemSetting = settings[item] || DEFAULT_ITEM_SETTINGS[item];
                                    const description = itemSetting?.description;
                                    return (
                                    <tr key={item} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-4 py-2 font-bold text-slate-700 bg-white group-hover:bg-slate-50/50 sticky left-0 z-10 border-r border-slate-100 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                                            <div className="flex items-center gap-1.5">
                                                <span>{item}</span>
                                                {description && (
                                                    <div className="relative group/tooltip">
                                                        <Info className="w-3.5 h-3.5 text-slate-400 hover:text-teal-500 cursor-help transition-colors" />
                                                        <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 z-50 invisible group-hover/tooltip:visible opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200">
                                                            <div className="bg-slate-800 text-white text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap max-w-[250px] whitespace-normal">
                                                                {description}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        {dates.map(date => {
                                            const record = filteredRecords.find(r => r.date === date);
                                            const val = record?.items[item];
                                            return (
                                                <td key={`${item}-${date}`} className="px-4 py-2 text-center">
                                                    {val !== undefined ? (
                                                        <span className="font-mono text-base text-slate-800">
                                                            {typeof val === 'number' && !Number.isInteger(val)
                                                                ? val.toFixed(1)
                                                                : val}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300 text-xs">-</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        );
    };

    // --- Graph View Render ---
    const renderGraphView = () => {
        // Prepare graph data (already unified records)
        const graphData = records.map(r => {
            const point: any = { date: r.date };
            // Populate selected items
            selectedItems.forEach(item => {
                const val = r.items[item];
                if (val !== undefined && val !== null) {
                    point[item] = normalizeValue(item, val); // Normalization for Y-Axis
                    point[`${item}_original`] = val;
                }
            });
            return point;
        });

        // Toggle item selection
        const toggleItem = (item: string) => {
            if (selectedItems.includes(item)) {
                setSelectedItems(selectedItems.filter(i => i !== item));
            } else {
                if (selectedItems.length >= 6) return;
                setSelectedItems([...selectedItems, item]);
            }
        };

        return (
            <div className="space-y-6">
                {/* Item Selector */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <Filter className="w-4 h-4 text-teal-500" />
                            表示項目を選択 <span className="text-xs font-normal text-slate-400">(最大6つ)</span>
                        </label>
                        <Link href="/profile/settings/items" className="text-xs text-teal-600 hover:text-teal-700 hover:underline flex items-center gap-1">
                            <SettingsIcon className="w-3 h-3" />
                            基準値・タグ設定
                        </Link>
                    </div>

                    <div className="relative">
                        <div className="flex gap-2 flex-wrap mb-2">
                            {selectedItems.map((item, idx) => (
                                <span key={item}
                                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold text-white shadow-sm pl-4 pr-2 transition-transform hover:scale-105"
                                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}>
                                    {item}
                                    <button onClick={() => toggleItem(item)} className="hover:bg-white/20 rounded-full p-0.5 ml-1 transition-colors">
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                            {selectedItems.length < 6 && (
                                <button
                                    onClick={() => setIsSelectorOpen(!isSelectorOpen)}
                                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm border-2 border-dashed border-slate-200 text-slate-500 hover:border-teal-500 hover:text-teal-600 hover:bg-teal-50/50 transition-all font-medium"
                                >
                                    <Plus className="w-3 h-3" /> 追加
                                </button>
                            )}
                        </div>

                        {isSelectorOpen && (
                            <div className="absolute top-full left-0 w-full md:w-[400px] bg-white border border-slate-200 shadow-xl rounded-xl z-30 mt-2 p-3 animate-in fade-in zoom-in-95 duration-200">
                                <div className="relative mb-3">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="項目名、またはタグ(肝臓, 糖など)で検索..."
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none text-slate-800"
                                        autoFocus
                                    />
                                </div>
                                <div className="max-h-[250px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                    {filteredItems.map(item => (
                                        <button
                                            key={item}
                                            onClick={() => {
                                                toggleItem(item);
                                                setIsSelectorOpen(false);
                                                setSearchQuery('');
                                            }}
                                            disabled={selectedItems.includes(item)}
                                            className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:bg-slate-50 flex justify-between items-center group transition-colors"
                                        >
                                            <span className="font-medium text-slate-700 group-hover:text-teal-700">{item}</span>
                                            <div className="flex gap-1">
                                                {settings[item]?.tags?.map(t => (
                                                    <span key={t} className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 border border-slate-200">{t}</span>
                                                ))}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Chart Area */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-[500px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={graphData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                            <YAxis
                                stroke="#94a3b8"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                domain={[0, 100]}
                                tickFormatter={(val) => `${val}%`}
                                label={{ value: '基準範囲比較 (%)', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 12 }}
                            />
                            <Tooltip
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="bg-white/95 backdrop-blur-sm p-4 border border-slate-200 shadow-lg rounded-xl min-w-[200px]">
                                                <p className="font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">{label}</p>
                                                <div className="space-y-3">
                                                    {payload.map((entry: any) => {
                                                        const item = entry.name;
                                                        const originalVal = entry.payload[`${item}_original`];
                                                        const setting = settings[item];

                                                        let statusNode = null;
                                                        if (setting?.safeMin !== undefined && setting.safeMin !== null && setting?.safeMax !== undefined && setting.safeMax !== null) {
                                                            const isSafe = originalVal >= setting.safeMin && originalVal <= setting.safeMax;
                                                            statusNode = isSafe
                                                                ? <span className="text-teal-600 text-[10px] font-bold bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">適正</span>
                                                                : <span className="text-red-500 text-[10px] font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-100">基準外</span>;
                                                        }

                                                        return (
                                                            <div key={item} className="text-sm">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <div className="w-2 h-2 rounded-full ring-2 ring-white shadow-sm" style={{ backgroundColor: entry.color }} />
                                                                    <span className="font-medium text-slate-600 text-xs">{item}</span>
                                                                </div>
                                                                <div className="pl-4 flex items-center justify-between gap-4">
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="font-mono font-bold text-lg text-slate-800">{originalVal}</span>
                                                                    </div>
                                                                    {statusNode}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Legend wrapperStyle={{ paddingTop: '20px' }} />

                            {/* Safe Ranges Backgrounds */}
                            {selectedItems.map((item, idx) => {
                                const setting = settings[item];
                                if (setting && setting.safeMin !== null && setting.safeMax !== null) {
                                    const y1 = normalizeValue(item, setting.safeMin!);
                                    const y2 = normalizeValue(item, setting.safeMax!);
                                    return (
                                        <ReferenceArea
                                            key={`${item}-safe`}
                                            y1={y1}
                                            y2={y2}
                                            fill={COLORS[idx % COLORS.length]}
                                            fillOpacity={0.05}
                                            ifOverflow="extendDomain"
                                        />
                                    );
                                }
                                return null;
                            })}

                            {selectedItems.map((item, idx) => (
                                <Line
                                    key={item}
                                    type="monotone"
                                    dataKey={item}
                                    name={item}
                                    stroke={COLORS[idx % COLORS.length]}
                                    strokeWidth={3}
                                    dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: COLORS[idx % COLORS.length] }}
                                    activeDot={{ r: 6, strokeWidth: 0, fill: COLORS[idx % COLORS.length] }}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );
    };

    // Get currently displayed records based on view mode and filters
    const getDisplayedRecords = (): TrendRecord[] => {
        if (viewMode === 'graph') {
            // Graph view shows all records
            return records;
        }

        // Table view - filter by tab
        let filteredRecords = records.filter(r => {
            if (listTab === 'hospital') return r.source === 'hospital';
            if (listTab === 'smartphone') return r.source === 'smartphone';
            return true;
        });

        // For smartphone data, apply date range filter and aggregation
        if (listTab === 'smartphone') {
            const { startDate, endDate } = getDateRange;
            filteredRecords = filteredRecords.filter(r => {
                const recordDate = new Date(r.date);
                return recordDate >= startDate && recordDate <= endDate;
            });
            filteredRecords = aggregateRecords(filteredRecords);
        }

        return filteredRecords;
    };

    const handleCopy = (copyAll: boolean) => {
        const targetRecords = copyAll ? records : getDisplayedRecords();

        if (targetRecords.length === 0) {
            toast.error('コピーするデータがありません');
            setShowCopyMenu(false);
            return;
        }

        let text = "";

        if (copyAll) {
            text += `【全データ】\n\n`;
        } else {
            const sourceLabel = viewMode === 'graph'
                ? '全データ'
                : (listTab === 'hospital' ? '病院データ' : 'スマホデータ');

            text += `【${sourceLabel}】\n`;
            if (viewMode === 'table' && listTab === 'smartphone') {
                text += `期間: ${getPeriodLabel()}\n`;
                if (timeRange !== 'day' && timeRange !== 'custom') {
                    text += `※平均値で表示\n`;
                }
            }
            text += '\n';
        }

        targetRecords.forEach(record => {
            const sourceTag = copyAll ? (record.source === 'hospital' ? '[病院]' : '[スマホ]') : '';
            text += `＜${record.date}＞${sourceTag}\n`;
            Object.entries(record.items).forEach(([key, val]) => {
                text += `${key}: ${val}\n`;
            });
            text += '\n';
        });

        navigator.clipboard.writeText(text).then(() => {
            toast.success('コピーしました');
            setShowCopyMenu(false);
        });
    };

    return (
        <div className="min-h-screen pb-24 md:pb-8">
            <Header />

            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 sticky top-0 md:top-16 z-30">
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-0 md:h-14 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
                    {/* Header row */}
                    <div className="flex items-center justify-between md:gap-4">
                        <h1 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 whitespace-nowrap">
                            <TrendingUp className="w-5 h-5 text-teal-500" />
                            <span className="hidden sm:inline">数値トレンド分析</span>
                            <span className="sm:hidden">推移</span>
                        </h1>

                        {/* Copy button - visible on mobile */}
                        <div className="relative md:hidden">
                            <button
                                onClick={() => setShowCopyMenu(!showCopyMenu)}
                                className="p-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                            >
                                <Copy className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Tab and copy row */}
                    <div className="flex items-center justify-between gap-4">
                        <div className="bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg flex shadow-inner flex-1 md:flex-none">
                            <button
                                onClick={() => setViewMode('table')}
                                className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-2 md:py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'table'
                                    ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-400 shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                            >
                                <Table className="w-4 h-4 md:w-3.5 md:h-3.5" />
                                シート表示
                            </button>
                            <button
                                onClick={() => setViewMode('graph')}
                                className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-3 py-2 md:py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'graph'
                                    ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-400 shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                            >
                                <TrendingUp className="w-4 h-4 md:w-3.5 md:h-3.5" />
                                グラフ分析
                            </button>
                        </div>

                        {/* Copy button - hidden on mobile, visible on desktop */}
                        <div className="relative hidden md:block">
                            <button
                                onClick={() => setShowCopyMenu(!showCopyMenu)}
                                className="text-xs font-bold flex items-center gap-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors shrink-0"
                            >
                                <Copy className="w-3.5 h-3.5" />
                                情報コピー
                                <ChevronDown className="w-3 h-3" />
                            </button>
                        </div>
                    </div>

                    {/* Copy menu dropdown */}
                    {showCopyMenu && (
                        <>
                            <div
                                className="fixed inset-0 z-40"
                                onClick={() => setShowCopyMenu(false)}
                            />
                            <div className="absolute right-4 top-12 md:right-6 md:top-14 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-50 min-w-[160px] py-1 animate-in fade-in zoom-in-95 duration-150">
                                <button
                                    onClick={() => handleCopy(false)}
                                    className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                                >
                                    <Filter className="w-4 h-4 text-teal-500" />
                                    表示中のデータ
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

            <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6">

                {isLoading ? (
                    <div className="h-[400px] flex items-center justify-center text-slate-400 bg-white rounded-xl border border-slate-100 border-dashed">
                        <div className="animate-pulse flex flex-col items-center gap-3">
                            <div className="w-8 h-8 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
                            <span className="text-sm font-medium">データを読み込み中...</span>
                        </div>
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {viewMode === 'table' ? renderTableView() : renderGraphView()}
                    </div>
                )}
            </div>
        </div>
    );
}
