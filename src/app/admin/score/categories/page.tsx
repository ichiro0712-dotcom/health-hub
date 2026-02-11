'use client';

import { useEffect, useState, useCallback } from 'react';
import { ListChecks, Plus, Trash2, Save, X } from 'lucide-react';

interface HealthCategory {
  id: string;
  name: string;
  rank: string;
  avgScore: number;
  description: string;
}

const RANKS = ['SS', 'S', 'A', 'B', 'C'];

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

const rankColors: Record<string, string> = {
  SS: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  S: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  A: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  B: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  C: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function AdminScoreCategoriesPage() {
  const [categories, setCategories] = useState<HealthCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/prompts?key=score.health_categories');
      if (!res.ok) throw new Error('取得失敗');
      const data = await res.json();
      const promptData = (data.data || [])[0] || data;
      if (promptData?.value) {
        const parsed = JSON.parse(promptData.value);
        setCategories(Array.isArray(parsed) ? parsed : []);
      } else {
        setCategories([]);
      }
    } catch {
      setError('カテゴリの取得に失敗しました');
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const addCategory = () => {
    setCategories(prev => [
      ...prev,
      {
        id: `cat_${Date.now()}`,
        name: '',
        rank: 'B',
        avgScore: 50,
        description: '',
      },
    ]);
  };

  const removeCategory = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const updateCategory = (id: string, field: keyof HealthCategory, value: string | number) => {
    setCategories(prev =>
      prev.map(c => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/prompts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'score.health_categories',
          value: JSON.stringify(categories),
        }),
      });
      if (!res.ok) throw new Error('保存失敗');
      setToast({ message: '全カテゴリを保存しました', type: 'success' });
    } catch {
      setToast({ message: '保存に失敗しました', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">カテゴリ管理</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            ヘルスカテゴリのランクや説明を設定します
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={addCategory}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300"
          >
            <Plus className="w-4 h-4" />
            追加
          </button>
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white text-sm rounded-lg hover:bg-teal-600 transition-colors font-medium disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? '保存中...' : '全て保存'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button onClick={fetchCategories} className="mt-2 text-sm text-red-700 underline hover:no-underline">再試行</button>
        </div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex gap-4 py-3">
              <div className="h-10 w-40 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              <div className="h-10 w-40 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              <div className="h-10 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              <div className="h-10 flex-1 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Header */}
          <div className="hidden md:grid md:grid-cols-12 gap-4 px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <div className="col-span-1">ID</div>
            <div className="col-span-3">名前</div>
            <div className="col-span-1">ランク</div>
            <div className="col-span-2">平均スコア</div>
            <div className="col-span-4">説明</div>
            <div className="col-span-1" />
          </div>

          {categories.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <ListChecks className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>カテゴリがありません</p>
              <button onClick={addCategory} className="mt-3 text-sm text-teal-600 dark:text-teal-400 underline hover:no-underline">
                最初のカテゴリを追加
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {categories.map(cat => (
                <div key={cat.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-4 py-3 items-center">
                  <div className="md:col-span-1">
                    <label className="md:hidden text-xs font-medium text-slate-500 mb-1 block">ID</label>
                    <input
                      type="text"
                      value={cat.id}
                      onChange={e => updateCategory(cat.id, 'id', e.target.value)}
                      className="w-full px-2 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="md:hidden text-xs font-medium text-slate-500 mb-1 block">名前</label>
                    <input
                      type="text"
                      value={cat.name}
                      onChange={e => updateCategory(cat.id, 'name', e.target.value)}
                      placeholder="カテゴリ名"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="md:hidden text-xs font-medium text-slate-500 mb-1 block">ランク</label>
                    <select
                      value={cat.rank}
                      onChange={e => updateCategory(cat.id, 'rank', e.target.value)}
                      className={`w-full px-2 py-2 border rounded-lg text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-teal-500 ${rankColors[cat.rank] || 'bg-slate-100 text-slate-700'}`}
                    >
                      {RANKS.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="md:hidden text-xs font-medium text-slate-500 mb-1 block">平均スコア</label>
                    <input
                      type="number"
                      value={cat.avgScore}
                      onChange={e => updateCategory(cat.id, 'avgScore', parseFloat(e.target.value) || 0)}
                      min={0}
                      max={100}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className="md:hidden text-xs font-medium text-slate-500 mb-1 block">説明</label>
                    <input
                      type="text"
                      value={cat.description}
                      onChange={e => updateCategory(cat.id, 'description', e.target.value)}
                      placeholder="カテゴリの説明"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div className="md:col-span-1 flex justify-end">
                    <button
                      onClick={() => removeCategory(cat.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      aria-label="削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
