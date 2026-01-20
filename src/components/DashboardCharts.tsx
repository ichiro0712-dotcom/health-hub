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

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

export const options = {
    responsive: true,
    plugins: {
        legend: {
            position: 'top' as const,
        },
        title: {
            display: true,
            text: 'バイタルデータ推移 (シミュレーション含む)',
        },
    },
};

const labels = ['January', 'February', 'March', 'April', 'May', 'June', 'July'];

export const data = {
    labels,
    datasets: [
        {
            label: '歩数 (Steps)',
            data: [3000, 4500, 6000, 5500, 7000, 8000, 9000],
            borderColor: 'rgb(53, 162, 235)',
            backgroundColor: 'rgba(53, 162, 235, 0.5)',
            yAxisID: 'y',
        },
        {
            label: '心拍数 (Heart Rate)',
            data: [72, 70, 68, 75, 71, 69, 65],
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            yAxisID: 'y1',
        },
    ],
};

import useSWR from 'swr';
import { getDashboardData } from '@/app/actions/dashboard';
import { Loader2 } from 'lucide-react';
import { DashboardResponse } from '@/types/dashboard';
import { FitDataset } from '@/types/fit';

export default function DashboardCharts() {
    const { data: result, error, isLoading } = useSWR<DashboardResponse>('dashboardData', getDashboardData);

    if (isLoading) {
        return (
            <div className='h-[300px] flex items-center justify-center border border-dashed border-gray-200 rounded-lg text-gray-400 bg-gray-50/50'>
                <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
            </div>
        );
    }

    if (error || !result?.success || !result?.data?.fit) {
        return (
            <div className='h-[300px] flex items-center justify-center border border-dashed border-200 rounded-lg text-red-400 bg-red-50/10'>
                <p>データ読み込みに失敗しました</p>
            </div>
        );
    }

    const { fit } = result.data;

    // If no data
    if (fit.labels.length === 0) {
        return (
            <div className='h-[300px] flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-lg text-gray-400 bg-gray-50/50'>
                <p>アクティビティデータが見つかりません</p>
                <p className="text-sm mt-2">Google Fitを同期してトレンドを表示しましょう</p>
            </div>
        )
    }

    // Map Fit data
    const fitDatasets = fit.datasets.map((ds: FitDataset) => ({
        ...ds,
        label: ds.label === 'Steps' ? '歩数' : ds.label === 'Heart Rate' ? '心拍数' : ds.label === 'Weight' ? '体重 (Fit)' : ds.label
    }));

    // Map Health Trend data (from checkups)
    const trendDatasets = result.data.trends?.datasets.map((ds: FitDataset) => ({
        ...ds,
        label: ds.label === 'Weight (Checkup)' ? '体重 (健診)' : ds.label === 'BMI' ? 'BMI' : ds.label
    })) || [];

    const chartData = {
        labels: fit.labels.length > 0 ? fit.labels : (result.data.trends?.labels || []),
        datasets: [...fitDatasets, ...trendDatasets]
    };

    return (
        <div className='h-[300px] bg-white dark:bg-slate-800 rounded-lg p-2'>
            <Line options={options} data={chartData} />
        </div>
    );
}
