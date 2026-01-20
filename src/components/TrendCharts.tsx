'use client';

import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useEffect, useState } from 'react';
import { TrendRecord } from '@/app/actions/trends';
import { Filter } from 'lucide-react';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

interface TrendChartsProps {
    records: TrendRecord[];
    availableKeys: string[];
}

export default function TrendCharts({ records, availableKeys }: TrendChartsProps) {
    // Default to 'Item 1' if available, or empty
    const [selectedKey, setSelectedKey] = useState<string>(availableKeys[0] || '');

    // Attempt to smartly select "Weight" or "BMI" initially if they exist
    useEffect(() => {
        if (!selectedKey && availableKeys.length > 0) {
            const weightKey = availableKeys.find(k => k.includes('体重') || k.toLowerCase().includes('weight'));
            if (weightKey) {
                setSelectedKey(weightKey);
            } else {
                setSelectedKey(availableKeys[0]);
            }
        }
    }, [availableKeys, selectedKey]);

    const labels = records.map(r => r.date);
    const data = records.map(r => r.items[selectedKey] || null); // Use null for missing data points

    const chartData = {
        labels,
        datasets: [
            {
                label: selectedKey,
                data: data,
                borderColor: 'rgb(0, 206, 209)', // #00CED1
                backgroundColor: 'rgba(0, 206, 209, 0.5)',
                tension: 0.3,
                pointBackgroundColor: 'rgb(255, 255, 255)',
                pointBorderWidth: 2,
                pointRadius: 4,
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top' as const,
            },
            title: {
                display: false,
            },
        },
        scales: {
            y: {
                beginAtZero: false, // Health values rarely start at 0 (e.g. BP, Weight)
                grid: {
                    color: '#f3f4f6'
                }
            },
            x: {
                grid: {
                    display: false
                }
            }
        }
    };

    if (records.length === 0) {
        return <div className="text-gray-500 text-center py-10">データがありません</div>;
    }

    return (
        <div className="space-y-4">
            {/* Key Selector */}
            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                <Filter className="w-5 h-5 text-gray-400" />
                <select
                    value={selectedKey}
                    onChange={(e) => setSelectedKey(e.target.value)}
                    className="bg-transparent text-sm font-bold text-gray-700 outline-none w-full cursor-pointer"
                >
                    {availableKeys.map(key => (
                        <option key={key} value={key}>{key}</option>
                    ))}
                </select>
            </div>

            <div className="h-[300px] w-full">
                <Line options={options} data={chartData} />
            </div>

            <p className="text-xs text-gray-400 text-right">※ グラフには数値として認識された項目のみ表示されます。</p>
        </div>
    );
}
