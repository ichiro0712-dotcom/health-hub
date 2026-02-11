'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Bug,
  AlertTriangle,
  Clock,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ErrorLog {
  id: string;
  level: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  metadata: Record<string, unknown> | null;
  userId: string | null;
  endpoint: string | null;
  resolved: boolean;
  createdAt: string;
}

interface ErrorStats {
  unresolvedCount: number;
  errors24h: number;
  hourlyData: { hour: string; count: number }[];
  categoryBreakdown: { category: string; count: number }[];
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);
  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
      type === 'success' ? 'bg-teal-500 text-white' : 'bg-red-500 text-white'
    }`}>
      {message}
      <button onClick={onClose} className="ml-2 hover:opacity-80"><X className="w-4 h-4" /></button>
    </div>
  );
}

const levelStyles: Record<string, { bg: string; text: string; label: string }> = {
  error: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-400',
    label: 'エラー',
  },
  warning: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-400',
    label: '警告',
  },
  info: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-400',
    label: '情報',
  },
};

export default function AdminBugsPage() {
  const [stats, setStats] = useState<ErrorStats | null>(null);
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [resolvedFilter, setResolvedFilter] = useState<string>('unresolved');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, errorsRes] = await Promise.all([
        fetch('/api/admin/errors/stats'),
        fetch('/api/admin/errors'),
      ]);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.data || statsData);
      }
      if (errorsRes.ok) {
        const errorsData = await errorsRes.json();
        setErrors(errorsData.data || []);
      }
    } catch {
      setError('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleResolve = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/errors`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, resolved: true }),
      });
      if (!res.ok) throw new Error('更新失敗');
      setToast({ message: '解決済みにしました', type: 'success' });
      fetchData();
    } catch {
      setToast({ message: '更新に失敗しました', type: 'error' });
    }
  };

  const filteredErrors = errors.filter(e => {
    const matchSearch =
      e.message.toLowerCase().includes(search.toLowerCase()) ||
      e.category.toLowerCase().includes(search.toLowerCase()) ||
      (e.endpoint || '').toLowerCase().includes(search.toLowerCase());
    const matchLevel = levelFilter === 'all' || e.level === levelFilter;
    const matchCategory = categoryFilter === 'all' || e.category === categoryFilter;
    const matchResolved =
      resolvedFilter === 'all' ||
      (resolvedFilter === 'unresolved' && !e.resolved) ||
      (resolvedFilter === 'resolved' && e.resolved);
    return matchSearch && matchLevel && matchCategory && matchResolved;
  });

  const categories = [...new Set(errors.map(e => e.category))];

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">バグ検知</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            エラーログの確認と対応管理
          </p>
        </div>
        <button
          onClick={fetchData}
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
          <button onClick={fetchData} className="mt-2 text-sm text-red-700 underline hover:no-underline">再試行</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                <div className="h-7 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-2" />
                <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="h-40 w-full bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary cards */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                <div className="flex items-center gap-3 mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <span className="text-sm text-slate-500 dark:text-slate-400">24時間のエラー</span>
                </div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.errors24h}</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                <div className="flex items-center gap-3 mb-2">
                  <Bug className="w-5 h-5 text-amber-500" />
                  <span className="text-sm text-slate-500 dark:text-slate-400">未解決</span>
                </div>
                <p className={`text-2xl font-bold ${stats.unresolvedCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {stats.unresolvedCount}
                </p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 col-span-2">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-5 h-5 text-blue-500" />
                  <span className="text-sm text-slate-500 dark:text-slate-400">カテゴリ別件数</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {stats.categoryBreakdown.map(cat => (
                    <span
                      key={cat.category}
                      className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs rounded-full"
                    >
                      {cat.category}: {cat.count}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Hourly chart */}
          {stats?.hourlyData && stats.hourlyData.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">時間別エラー数 (24時間)</h3>
              <div className="flex items-end gap-0.5 h-32">
                {stats.hourlyData.map((entry, i) => {
                  const max = Math.max(...stats.hourlyData.map(d => d.count), 1);
                  const heightPct = (entry.count / max) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                      {entry.count > 0 && (
                        <span className="text-[9px] text-slate-400">{entry.count}</span>
                      )}
                      <div
                        className={`w-full rounded-t transition-all ${
                          entry.count > 0
                            ? 'bg-red-400 dark:bg-red-500 hover:bg-red-500 dark:hover:bg-red-400'
                            : 'bg-slate-200 dark:bg-slate-700'
                        }`}
                        style={{ height: `${Math.max(heightPct, entry.count > 0 ? 8 : 2)}%` }}
                        title={`${entry.hour}: ${entry.count}件`}
                      />
                      <span className="text-[8px] text-slate-400">{entry.hour}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="メッセージ、カテゴリ、エンドポイントで検索..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={levelFilter}
                onChange={e => setLevelFilter(e.target.value)}
                className="px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">全レベル</option>
                <option value="error">エラー</option>
                <option value="warning">警告</option>
                <option value="info">情報</option>
              </select>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">全カテゴリ</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <select
                value={resolvedFilter}
                onChange={e => setResolvedFilter(e.target.value)}
                className="px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="all">全て</option>
                <option value="unresolved">未解決</option>
                <option value="resolved">解決済み</option>
              </select>
            </div>
          </div>

          {/* Error list */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {filteredErrors.length === 0 ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-400 opacity-50" />
                <p>該当するエラーが見つかりません</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredErrors.map(err => {
                  const style = levelStyles[err.level] || levelStyles.info;
                  const isExpanded = detailId === err.id;

                  return (
                    <div key={err.id}>
                      <div
                        className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                        onClick={() => setDetailId(isExpanded ? null : err.id)}
                      >
                        <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium mt-0.5 ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-900 dark:text-white truncate">{err.message}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                            <span>{err.category}</span>
                            {err.endpoint && <span className="font-mono">{err.endpoint}</span>}
                            <span>{formatDateTime(err.createdAt)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {err.resolved ? (
                            <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">
                              解決済み
                            </span>
                          ) : (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                handleResolve(err.id);
                              }}
                              className="px-3 py-1 bg-teal-500 text-white text-xs rounded-lg hover:bg-teal-600 transition-colors font-medium"
                            >
                              解決済み
                            </button>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </div>

                      {/* Detail panel */}
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                          <div className="pt-3 space-y-3">
                            <div>
                              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">メッセージ</p>
                              <p className="text-sm text-slate-900 dark:text-white">{err.message}</p>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div>
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">レベル</p>
                                <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text}`}>
                                  {style.label}
                                </span>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">カテゴリ</p>
                                <p className="text-sm text-slate-700 dark:text-slate-300">{err.category}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">エンドポイント</p>
                                <p className="text-sm font-mono text-slate-700 dark:text-slate-300">{err.endpoint || '-'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">ユーザーID</p>
                                <p className="text-sm font-mono text-slate-700 dark:text-slate-300">{err.userId || '-'}</p>
                              </div>
                            </div>
                            {err.metadata && Object.keys(err.metadata).length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">メタデータ</p>
                                <pre className="text-xs font-mono text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 overflow-x-auto max-h-48 overflow-y-auto">
                                  {JSON.stringify(err.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">発生日時</p>
                              <p className="text-sm text-slate-700 dark:text-slate-300">
                                {new Date(err.createdAt).toLocaleString('ja-JP')}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
