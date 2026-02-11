'use client';

import { useEffect, useState, useCallback } from 'react';
import { Users, Search, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface UserItem {
  id: string;
  name: string;
  email: string;
  image: string | null;
  createdAt: string;
  integrations: string[];
  profileCompletion: number;
  lastChatAt: string | null;
}

interface IntegrationIcon {
  name: string;
  label: string;
  color: string;
}

const integrationIcons: Record<string, IntegrationIcon> = {
  fitbit: { name: 'F', label: 'Fitbit', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' },
  google_fit: { name: 'G', label: 'Google Fit', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  apple_health: { name: 'A', label: 'Apple Health', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const perPage = 20;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        perPage: String(perPage),
        ...(search && { search }),
      });
      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) throw new Error('取得失敗');
      const data = await res.json();
      setUsers(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.total || 0);
    } catch {
      setError('ユーザーの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">ユーザー管理</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            登録ユーザー一覧 ({totalCount}人)
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="名前またはメールアドレスで検索..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button onClick={fetchUsers} className="mt-2 text-sm text-red-700 underline hover:no-underline">再試行</button>
        </div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-4 py-3">
              <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                <div className="h-3 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <Users className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-slate-500 dark:text-slate-400">該当するユーザーが見つかりません</p>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Header */}
            <div className="hidden md:grid md:grid-cols-12 gap-4 px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <div className="col-span-3">ユーザー</div>
              <div className="col-span-2">登録日</div>
              <div className="col-span-2">連携</div>
              <div className="col-span-2">プロフィール</div>
              <div className="col-span-2">最終チャット</div>
              <div className="col-span-1" />
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {users.map(user => (
                <div
                  key={user.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-4 py-3 items-center hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                  onClick={() => router.push(`/admin/users/${user.id}`)}
                >
                  <div className="md:col-span-3 flex items-center gap-3">
                    {user.image ? (
                      <img
                        src={user.image}
                        alt=""
                        className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-teal-700 dark:text-teal-400">
                          {(user.name || user.email)?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user.name || '名前未設定'}</p>
                      <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <span className="md:hidden text-xs text-slate-400 mr-1">登録:</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">{formatDate(user.createdAt)}</span>
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex gap-1">
                      {user.integrations && user.integrations.length > 0 ? (
                        user.integrations.map(int => {
                          const icon = integrationIcons[int];
                          return icon ? (
                            <span
                              key={int}
                              className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${icon.color}`}
                              title={icon.label}
                            >
                              {icon.name}
                            </span>
                          ) : null;
                        })
                      ) : (
                        <span className="text-xs text-slate-400">なし</span>
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden max-w-[100px]">
                        <div
                          className={`h-full rounded-full transition-all ${
                            user.profileCompletion >= 80
                              ? 'bg-teal-500'
                              : user.profileCompletion >= 50
                              ? 'bg-amber-500'
                              : 'bg-red-400'
                          }`}
                          style={{ width: `${user.profileCompletion}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 w-8">
                        {user.profileCompletion}%
                      </span>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {user.lastChatAt ? formatDate(user.lastChatAt) : '-'}
                    </span>
                  </div>

                  <div className="md:col-span-1 flex justify-end">
                    <ExternalLink className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {(page - 1) * perPage + 1}-{Math.min(page * perPage, totalCount)} / {totalCount}件
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-slate-600 dark:text-slate-300 px-2">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
