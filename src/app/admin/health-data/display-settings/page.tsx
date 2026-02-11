'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Settings,
  Search,
  Save,
  X,
  ToggleLeft,
  ToggleRight,
  Filter,
} from 'lucide-react';

interface HealthItem {
  id: string;
  itemName: string;
  displayName: string;
  safeMin: number | null;
  safeMax: number | null;
  minVal: number | null;
  maxVal: number | null;
  tags: string[];
  description: string;
  isActive: boolean;
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

export default function AdminDisplaySettingsPage() {
  const [items, setItems] = useState<HealthItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<HealthItem>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/health-items');
      if (!res.ok) throw new Error('取得失敗');
      const data = await res.json();
      setItems(data.data || []);
    } catch {
      setError('表示設定の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const filteredItems = items.filter(item => {
    const q = search.toLowerCase();
    const matchSearch =
      item.itemName.toLowerCase().includes(q) ||
      item.displayName.toLowerCase().includes(q) ||
      item.tags.some(t => t.toLowerCase().includes(q)) ||
      item.description.toLowerCase().includes(q);
    const matchActive = !showActiveOnly || item.isActive;
    return matchSearch && matchActive;
  });

  const startEditing = (item: HealthItem) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const handleSave = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/health-items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error('保存失敗');
      setToast({ message: '保存しました', type: 'success' });
      setEditingId(null);
      fetchItems();
    } catch {
      setToast({ message: '保存に失敗しました', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item: HealthItem) => {
    try {
      const res = await fetch('/api/admin/health-items', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, isActive: !item.isActive }),
      });
      if (!res.ok) throw new Error('更新失敗');
      fetchItems();
    } catch {
      setToast({ message: '更新に失敗しました', type: 'error' });
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">表示設定</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          ヘルス項目の表示名・基準範囲・有効/無効を管理します
        </p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="項目名、タグ、説明で検索..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <button
          onClick={() => setShowActiveOnly(!showActiveOnly)}
          className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm transition-colors ${
            showActiveOnly
              ? 'bg-teal-50 border-teal-200 text-teal-700 dark:bg-teal-900/20 dark:border-teal-700 dark:text-teal-400'
              : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
          }`}
        >
          <Filter className="w-4 h-4" />
          有効のみ
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button onClick={fetchItems} className="mt-2 text-sm text-red-700 underline hover:no-underline">再試行</button>
        </div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex gap-4 py-3">
              <div className="h-10 flex-1 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <Settings className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-slate-500 dark:text-slate-400">該当する項目が見つかりません</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="hidden xl:grid xl:grid-cols-12 gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <div className="col-span-2">項目名</div>
            <div className="col-span-2">表示名</div>
            <div className="col-span-1">安全下限</div>
            <div className="col-span-1">安全上限</div>
            <div className="col-span-1">最小値</div>
            <div className="col-span-1">最大値</div>
            <div className="col-span-2">タグ</div>
            <div className="col-span-1">状態</div>
            <div className="col-span-1" />
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-700">
            {filteredItems.map(item => (
              <div key={item.id}>
                {editingId === item.id ? (
                  <div className="px-4 py-4 bg-teal-50/30 dark:bg-teal-900/10 space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">表示名</label>
                        <input
                          type="text"
                          value={editForm.displayName || ''}
                          onChange={e => setEditForm(prev => ({ ...prev, displayName: e.target.value }))}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">安全下限</label>
                        <input
                          type="number"
                          value={editForm.safeMin ?? ''}
                          onChange={e => setEditForm(prev => ({ ...prev, safeMin: e.target.value ? parseFloat(e.target.value) : null }))}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">安全上限</label>
                        <input
                          type="number"
                          value={editForm.safeMax ?? ''}
                          onChange={e => setEditForm(prev => ({ ...prev, safeMax: e.target.value ? parseFloat(e.target.value) : null }))}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">最小値 / 最大値</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={editForm.minVal ?? ''}
                            onChange={e => setEditForm(prev => ({ ...prev, minVal: e.target.value ? parseFloat(e.target.value) : null }))}
                            placeholder="min"
                            className="w-1/2 px-2 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                          <input
                            type="number"
                            value={editForm.maxVal ?? ''}
                            onChange={e => setEditForm(prev => ({ ...prev, maxVal: e.target.value ? parseFloat(e.target.value) : null }))}
                            placeholder="max"
                            className="w-1/2 px-2 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">タグ（カンマ区切り）</label>
                        <input
                          type="text"
                          value={(editForm.tags || []).join(', ')}
                          onChange={e => setEditForm(prev => ({ ...prev, tags: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">説明</label>
                        <input
                          type="text"
                          value={editForm.description || ''}
                          onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white text-sm rounded-lg hover:bg-teal-600 disabled:opacity-50 font-medium"
                      >
                        <Save className="w-4 h-4" />
                        {saving ? '保存中...' : '保存'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="grid grid-cols-2 xl:grid-cols-12 gap-2 xl:gap-3 px-4 py-3 items-center hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                    onClick={() => startEditing(item)}
                  >
                    <div className="xl:col-span-2">
                      <span className="text-sm font-mono text-slate-700 dark:text-slate-300">{item.itemName}</span>
                    </div>
                    <div className="xl:col-span-2">
                      <span className="text-sm text-slate-900 dark:text-white font-medium">{item.displayName}</span>
                    </div>
                    <div className="xl:col-span-1">
                      <span className="text-sm text-slate-500 dark:text-slate-400">{item.safeMin ?? '-'}</span>
                    </div>
                    <div className="xl:col-span-1">
                      <span className="text-sm text-slate-500 dark:text-slate-400">{item.safeMax ?? '-'}</span>
                    </div>
                    <div className="xl:col-span-1">
                      <span className="text-sm text-slate-500 dark:text-slate-400">{item.minVal ?? '-'}</span>
                    </div>
                    <div className="xl:col-span-1">
                      <span className="text-sm text-slate-500 dark:text-slate-400">{item.maxVal ?? '-'}</span>
                    </div>
                    <div className="xl:col-span-2 col-span-2">
                      <div className="flex flex-wrap gap-1">
                        {item.tags.length > 0
                          ? item.tags.map(t => (
                              <span key={t} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded">
                                {t}
                              </span>
                            ))
                          : <span className="text-xs text-slate-400">-</span>
                        }
                      </div>
                    </div>
                    <div className="xl:col-span-1" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => handleToggleActive(item)}
                        aria-label={item.isActive ? '無効にする' : '有効にする'}
                      >
                        {item.isActive ? (
                          <ToggleRight className="w-6 h-6 text-teal-500" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                        )}
                      </button>
                    </div>
                    <div className="xl:col-span-1 hidden xl:block" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
