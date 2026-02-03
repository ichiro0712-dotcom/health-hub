'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Footprints, Flame, Moon, Heart, ArrowRight } from 'lucide-react';
import { StatsCardSkeleton } from '@/components/ui/Skeleton';

interface QuickStatsProps {
  dashboardData: any;
}

interface StatItem {
  id: string;
  label: string;
  value: string;
  unit: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  trend?: string;
  href: string;
}

export function QuickStats({ dashboardData }: QuickStatsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<StatItem[]>([]);

  useEffect(() => {
    // データを処理してstatsを生成
    const timer = setTimeout(() => {
      const fitData = dashboardData?.fit;

      const processedStats: StatItem[] = [
        {
          id: 'steps',
          label: '今日の歩数',
          value: fitData?.steps?.toLocaleString() || '--',
          unit: '歩',
          icon: Footprints,
          color: 'text-teal-600 dark:text-teal-400',
          bgColor: 'bg-teal-50 dark:bg-teal-900/30',
          trend: fitData?.steps > 8000 ? '+12%' : undefined,
          href: '/trends',
        },
        {
          id: 'calories',
          label: '消費カロリー',
          value: fitData?.calories?.toLocaleString() || '--',
          unit: 'kcal',
          icon: Flame,
          color: 'text-orange-600 dark:text-orange-400',
          bgColor: 'bg-orange-50 dark:bg-orange-900/30',
          href: '/trends',
        },
        {
          id: 'sleep',
          label: '昨夜の睡眠',
          value: fitData?.sleep?.duration
            ? (fitData.sleep.duration / 60).toFixed(1)
            : '--',
          unit: '時間',
          icon: Moon,
          color: 'text-indigo-600 dark:text-indigo-400',
          bgColor: 'bg-indigo-50 dark:bg-indigo-900/30',
          href: '/trends',
        },
        {
          id: 'heart',
          label: '平均心拍数',
          value: fitData?.heartRate?.average?.toString() || '--',
          unit: 'bpm',
          icon: Heart,
          color: 'text-rose-600 dark:text-rose-400',
          bgColor: 'bg-rose-50 dark:bg-rose-900/30',
          href: '/trends',
        },
      ];

      setStats(processedStats);
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [dashboardData]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <StatCard key={stat.id} stat={stat} />
      ))}
    </div>
  );
}

function StatCard({ stat }: { stat: StatItem }) {
  const Icon = stat.icon;

  return (
    <Link
      href={stat.href}
      className="group bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-teal-200 dark:hover:border-teal-700 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${stat.bgColor}`}>
          <Icon className={`w-5 h-5 ${stat.color}`} />
        </div>
        <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-teal-500 group-hover:translate-x-0.5 transition-all" />
      </div>

      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
          {stat.label}
        </p>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {stat.value}
          </span>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {stat.unit}
          </span>
        </div>
        {stat.trend && (
          <span className="inline-block mt-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
            {stat.trend}
          </span>
        )}
      </div>
    </Link>
  );
}
