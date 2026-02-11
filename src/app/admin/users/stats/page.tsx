'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Activity,
  MessageSquare,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';

interface UserStats {
  totalUsers: number;
  activeUsers7d: number;
  activeUsers30d: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  chatSessionsToday: number;
  avgProfileCompletion: number;
  integrationBreakdown: { name: string; count: number }[];
  dailySignups: { date: string; count: number }[];
  dailyActiveUsers: { date: string; count: number }[];
}

function StatCard({
  label,
  value,
  icon,
  color,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  sub?: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function BarChart({
  data,
  label,
  color = 'bg-teal-400',
}: {
  data: { date: string; count: number }[];
  label: string;
  color?: string;
}) {
  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">{label}</h3>
      <div className="flex items-end gap-1 h-40">
        {data.map((entry, i) => {
          const heightPct = (entry.count / maxCount) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] text-slate-500 dark:text-slate-400">{entry.count}</span>
              <div
                className={`w-full ${color} dark:opacity-80 rounded-t transition-all hover:opacity-80`}
                style={{ height: `${Math.max(heightPct, 2)}%` }}
                title={`${entry.date}: ${entry.count}`}
              />
              <span className="text-[9px] text-slate-400 truncate w-full text-center">
                {new Date(entry.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminUserStatsPage() {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users/stats');
      if (!res.ok) throw new Error('取得失敗');
      const data = await res.json();
      setStats(data.data || data);
    } catch {
      setError('統計の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">ユーザー統計</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            ユーザー登録とアクティビティの概要
          </p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          更新
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button onClick={fetchStats} className="mt-2 text-sm text-red-700 underline hover:no-underline">再試行</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse mb-3" />
                <div className="h-7 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-2" />
                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map(i => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-4" />
                <div className="h-40 w-full bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ) : stats ? (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="総ユーザー数"
              value={stats.totalUsers.toLocaleString()}
              icon={<Users className="w-5 h-5 text-white" />}
              color="bg-teal-500"
            />
            <StatCard
              label="アクティブ (7日)"
              value={stats.activeUsers7d.toLocaleString()}
              icon={<Activity className="w-5 h-5 text-white" />}
              color="bg-blue-500"
              sub={`30日: ${stats.activeUsers30d.toLocaleString()}`}
            />
            <StatCard
              label="新規 (今週)"
              value={stats.newUsersThisWeek.toLocaleString()}
              icon={<UserPlus className="w-5 h-5 text-white" />}
              color="bg-green-500"
              sub={`今月: ${stats.newUsersThisMonth.toLocaleString()}`}
            />
            <StatCard
              label="本日のチャット"
              value={stats.chatSessionsToday.toLocaleString()}
              icon={<MessageSquare className="w-5 h-5 text-white" />}
              color="bg-purple-500"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {stats.dailySignups && stats.dailySignups.length > 0 && (
              <BarChart
                data={stats.dailySignups}
                label="日別新規登録数"
                color="bg-green-400"
              />
            )}
            {stats.dailyActiveUsers && stats.dailyActiveUsers.length > 0 && (
              <BarChart
                data={stats.dailyActiveUsers}
                label="日別アクティブユーザー数"
                color="bg-blue-400"
              />
            )}
          </div>

          {/* Additional stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Profile completion */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-teal-500" />
                平均プロフィール完成度
              </h3>
              <div className="flex items-center gap-4">
                <div className="relative w-24 h-24">
                  <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-slate-200 dark:text-slate-700"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      strokeDasharray={`${stats.avgProfileCompletion * 2.64} 264`}
                      strokeLinecap="round"
                      className="text-teal-500"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-slate-900 dark:text-white">
                    {stats.avgProfileCompletion}%
                  </span>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    全ユーザーの平均プロフィール完成度
                  </p>
                </div>
              </div>
            </div>

            {/* Integration breakdown */}
            {stats.integrationBreakdown && stats.integrationBreakdown.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">連携サービス内訳</h3>
                <div className="space-y-3">
                  {stats.integrationBreakdown.map(int => {
                    const percentage = stats.totalUsers > 0 ? (int.count / stats.totalUsers) * 100 : 0;
                    return (
                      <div key={int.name}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-slate-700 dark:text-slate-300">{int.name}</span>
                          <span className="text-sm font-medium text-slate-900 dark:text-white">
                            {int.count} ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-teal-400 dark:bg-teal-500 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
