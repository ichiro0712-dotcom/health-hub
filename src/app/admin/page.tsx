'use client';

import { useEffect, useState } from 'react';
import { Users, Activity, AlertTriangle, MessageSquare, RefreshCw, Database } from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalUsers: number;
  activeUsers7d: number;
  unresolvedErrors: number;
  chatSessionsToday: number;
}

function StatCard({
  label,
  value,
  icon,
  color,
  href,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  href?: string;
}) {
  const content = (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-md transition-shadow ${href ? 'cursor-pointer' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{label}</p>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        </div>
        <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, errorsRes] = await Promise.all([
        fetch('/api/admin/users/stats'),
        fetch('/api/admin/errors/stats'),
      ]);

      const usersData = usersRes.ok ? await usersRes.json() : {};
      const errorsData = errorsRes.ok ? await errorsRes.json() : {};

      const ud = usersData.data || usersData;
      const ed = errorsData.data || errorsData;

      setStats({
        totalUsers: ud.totalUsers ?? 0,
        activeUsers7d: ud.activeUsers?.last7Days ?? ud.activeUsers7d ?? 0,
        unresolvedErrors: ed.unresolvedCount ?? 0,
        chatSessionsToday: ud.totalChatSessions ?? ud.chatSessionsToday ?? 0,
      });
    } catch {
      setError('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">ダッシュボード</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Health Hub 管理画面の概要</p>
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
          <button
            onClick={fetchStats}
            className="mt-2 text-sm text-red-700 dark:text-red-300 underline hover:no-underline"
          >
            再試行
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : stats ? (
          <>
            <StatCard
              label="総ユーザー数"
              value={stats.totalUsers.toLocaleString()}
              icon={<Users className="w-6 h-6 text-white" />}
              color="bg-teal-500"
              href="/admin/users"
            />
            <StatCard
              label="アクティブユーザー (7日)"
              value={stats.activeUsers7d.toLocaleString()}
              icon={<Activity className="w-6 h-6 text-white" />}
              color="bg-blue-500"
              href="/admin/users/stats"
            />
            <StatCard
              label="未解決エラー"
              value={stats.unresolvedErrors.toLocaleString()}
              icon={<AlertTriangle className="w-6 h-6 text-white" />}
              color={stats.unresolvedErrors > 0 ? 'bg-red-500' : 'bg-green-500'}
              href="/admin/bugs"
            />
            <StatCard
              label="本日のチャット"
              value={stats.chatSessionsToday.toLocaleString()}
              icon={<MessageSquare className="w-6 h-6 text-white" />}
              color="bg-purple-500"
              href="/admin/chat"
            />
          </>
        ) : null}
      </div>

      {/* Seed / Setup */}
      <div className="mb-8 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <Database className="w-5 h-5" />
              初期データ投入
            </h3>
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
              コードに定義されているデフォルトのプロンプト・ヘルス項目・質問マスタをDBに投入します。既存データは上書きされません。
            </p>
            {seedResult && (
              <p className="text-sm text-teal-600 dark:text-teal-400 mt-2 font-medium">{seedResult}</p>
            )}
          </div>
          <button
            onClick={async () => {
              setSeeding(true);
              setSeedResult(null);
              try {
                const res = await fetch('/api/admin/seed');
                const data = await res.json();
                if (data.success) {
                  setSeedResult(`完了: プロンプト ${data.results.prompts}件, ヘルス項目 ${data.results.healthItems}件, 質問 ${data.results.questions}件`);
                } else {
                  setSeedResult('エラー: ' + (data.error || '不明なエラー'));
                }
              } catch {
                setSeedResult('通信エラーが発生しました');
              } finally {
                setSeeding(false);
              }
            }}
            disabled={seeding}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600 transition-colors font-medium disabled:opacity-50 shrink-0"
          >
            <Database className="w-4 h-4" />
            {seeding ? '投入中...' : 'Seed実行'}
          </button>
        </div>
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">クイックアクセス</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/admin/chat/prompts"
            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:border-teal-300 dark:hover:border-teal-600 hover:shadow-md transition-all group"
          >
            <MessageSquare className="w-8 h-8 text-teal-500 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">プロンプト管理</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">AIチャットのプロンプトを編集</p>
          </Link>
          <Link
            href="/admin/bugs"
            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:border-teal-300 dark:hover:border-teal-600 hover:shadow-md transition-all group"
          >
            <AlertTriangle className="w-8 h-8 text-red-500 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">エラーログ</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">エラーの確認と対応</p>
          </Link>
          <Link
            href="/admin/users"
            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:border-teal-300 dark:hover:border-teal-600 hover:shadow-md transition-all group"
          >
            <Users className="w-8 h-8 text-blue-500 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">ユーザー管理</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">ユーザー情報の確認</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
