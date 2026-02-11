'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Mail,
  Calendar,
  Activity,
  MessageSquare,
  Database,
  Shield,
} from 'lucide-react';

interface UserDetail {
  id: string;
  name: string;
  email: string;
  image: string | null;
  createdAt: string;
  updatedAt: string;
  integrations: {
    name: string;
    connectedAt: string;
    lastSyncAt: string | null;
    status: string;
  }[];
  stats: {
    totalChatSessions: number;
    totalMessages: number;
    healthRecordsCount: number;
    profileCompletion: number;
    lastActiveAt: string | null;
    scoreHistory: { date: string; score: number }[];
  };
}

function InfoRow({ label, value, icon }: { label: string; value: string | React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 dark:border-slate-700 last:border-0">
      {icon && <span className="text-slate-400 mt-0.5">{icon}</span>}
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <div className="text-sm text-slate-900 dark:text-white mt-0.5">{value}</div>
      </div>
    </div>
  );
}

export default function AdminUserDetailPage() {
  const params = useParams();
  const userId = params.id as string;
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      if (!res.ok) throw new Error('取得失敗');
      const data = await res.json();
      setUser(data.data || data);
    } catch {
      setError('ユーザー情報の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="h-6 w-6 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse mb-4" />
                <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-2" />
                <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              </div>
            </div>
          </div>
          <div className="lg:col-span-2 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
                <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-4" />
                <div className="space-y-3">
                  <div className="h-10 w-full bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                  <div className="h-10 w-full bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          ユーザー一覧に戻る
        </Link>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button onClick={fetchUser} className="mt-2 text-sm text-red-700 underline hover:no-underline">再試行</button>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div>
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        ユーザー一覧に戻る
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex flex-col items-center">
              {user.image ? (
                <img src={user.image} alt="" className="w-20 h-20 rounded-full object-cover mb-4" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center mb-4">
                  <User className="w-10 h-10 text-teal-500" />
                </div>
              )}
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{user.name || '名前未設定'}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{user.email}</p>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
              <InfoRow
                label="登録日"
                value={formatDate(user.createdAt)}
                icon={<Calendar className="w-4 h-4" />}
              />
              <InfoRow
                label="最終更新"
                value={formatDate(user.updatedAt)}
                icon={<Calendar className="w-4 h-4" />}
              />
              <InfoRow
                label="最終アクティブ"
                value={user.stats.lastActiveAt ? formatDate(user.stats.lastActiveAt) : '未記録'}
                icon={<Activity className="w-4 h-4" />}
              />
            </div>

            {/* Profile completion */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">プロフィール完成度</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {user.stats.profileCompletion}%
                </span>
              </div>
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    user.stats.profileCompletion >= 80
                      ? 'bg-teal-500'
                      : user.stats.profileCompletion >= 50
                      ? 'bg-amber-500'
                      : 'bg-red-400'
                  }`}
                  style={{ width: `${user.stats.profileCompletion}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Integration section */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-teal-500" />
              連携サービス
            </h3>
            {user.integrations.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">連携なし</p>
            ) : (
              <div className="space-y-3">
                {user.integrations.map(int => (
                  <div
                    key={int.name}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{int.name}</p>
                      <p className="text-xs text-slate-400">
                        接続: {formatDate(int.connectedAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        int.status === 'active'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                      }`}>
                        {int.status === 'active' ? '有効' : '無効'}
                      </span>
                      {int.lastSyncAt && (
                        <p className="text-xs text-slate-400 mt-1">
                          最終同期: {formatDate(int.lastSyncAt)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Usage stats */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-500" />
              利用統計
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 text-center">
                <MessageSquare className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{user.stats.totalChatSessions}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">チャットセッション</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 text-center">
                <Mail className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{user.stats.totalMessages}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">総メッセージ数</p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 text-center">
                <Database className="w-6 h-6 text-teal-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{user.stats.healthRecordsCount}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">健康記録</p>
              </div>
            </div>
          </div>

          {/* Score history */}
          {user.stats.scoreHistory && user.stats.scoreHistory.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">スコア履歴</h3>
              <div className="flex items-end gap-1 h-32">
                {user.stats.scoreHistory.map((entry, i) => {
                  const height = `${Math.max(entry.score, 5)}%`;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-slate-500">{entry.score}</span>
                      <div
                        className="w-full bg-teal-400 dark:bg-teal-500 rounded-t transition-all hover:bg-teal-500 dark:hover:bg-teal-400"
                        style={{ height }}
                        title={`${entry.date}: ${entry.score}`}
                      />
                      <span className="text-[9px] text-slate-400 truncate w-full text-center">
                        {new Date(entry.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
