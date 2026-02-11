'use client';

import { useEffect, useState, useCallback } from 'react';
import { Database, Search, Plus, Save, X, Edit3 } from 'lucide-react';

interface MasterItem {
  id: string;
  code: string;
  standardName: string;
  jlac10: string;
  synonyms: string[];
  linkedItemsCount: number;
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

function TagInput({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
}) {
  const [inputValue, setInputValue] = useState('');

  const addTag = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInputValue('');
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter(t => t !== tag));
  };

  return (
    <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg min-h-[40px]">
      {tags.map(tag => (
        <span
          key={tag}
          className="flex items-center gap-1 px-2 py-0.5 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-xs rounded-full"
        >
          {tag}
          <button onClick={() => removeTag(tag)} className="hover:text-teal-900 dark:hover:text-teal-200">
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault();
            addTag();
          }
        }}
        onBlur={addTag}
        placeholder="同義語を入力してEnter"
        className="flex-1 min-w-[120px] px-1 py-0.5 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
      />
    </div>
  );
}

export default function AdminMasterItemsPage() {
  const [items, setItems] = useState<MasterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<MasterItem>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState<Partial<MasterItem>>({
    code: '',
    standardName: '',
    jlac10: '',
    synonyms: [],
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/master-items');
      if (!res.ok) throw new Error('取得失敗');
      const data = await res.json();
      setItems(data.data || []);
    } catch {
      setError('マスタ項目の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const filteredItems = items.filter(item => {
    const q = search.toLowerCase();
    return (
      item.code.toLowerCase().includes(q) ||
      item.standardName.toLowerCase().includes(q) ||
      item.jlac10.toLowerCase().includes(q) ||
      item.synonyms.some(s => s.toLowerCase().includes(q))
    );
  });

  const startEditing = (item: MasterItem) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/master-items', {
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

  const handleAddItem = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/master-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });
      if (!res.ok) throw new Error('追加失敗');
      setToast({ message: 'マスタ項目を追加しました', type: 'success' });
      setShowAddForm(false);
      setNewItem({ code: '', standardName: '', jlac10: '', synonyms: [] });
      fetchItems();
    } catch {
      setToast({ message: '追加に失敗しました', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">マスタ項目管理</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            検査項目の標準名・JLAC10コード・同義語を管理します
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white text-sm rounded-lg hover:bg-teal-600 transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          項目を追加
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="コード、標準名、JLAC10、同義語で検索..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
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
              <div className="h-10 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              <div className="h-10 w-40 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              <div className="h-10 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              <div className="h-10 flex-1 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="hidden lg:grid lg:grid-cols-12 gap-4 px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <div className="col-span-2">コード</div>
            <div className="col-span-3">標準名</div>
            <div className="col-span-2">JLAC10</div>
            <div className="col-span-3">同義語</div>
            <div className="col-span-1">紐付数</div>
            <div className="col-span-1" />
          </div>

          {filteredItems.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <Database className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>該当するマスタ項目が見つかりません</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredItems.map(item => (
                <div key={item.id}>
                  {editingId === item.id ? (
                    <div className="px-4 py-4 bg-teal-50/30 dark:bg-teal-900/10 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">標準名</label>
                          <input
                            type="text"
                            value={editForm.standardName || ''}
                            onChange={e => setEditForm(prev => ({ ...prev, standardName: e.target.value }))}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 mb-1">JLAC10</label>
                          <input
                            type="text"
                            value={editForm.jlac10 || ''}
                            onChange={e => setEditForm(prev => ({ ...prev, jlac10: e.target.value }))}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">同義語</label>
                        <TagInput
                          tags={editForm.synonyms || []}
                          onChange={synonyms => setEditForm(prev => ({ ...prev, synonyms }))}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                        >
                          キャンセル
                        </button>
                        <button
                          onClick={handleSaveEdit}
                          disabled={saving}
                          className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white text-sm rounded-lg hover:bg-teal-600 disabled:opacity-50 font-medium"
                        >
                          <Save className="w-4 h-4" />
                          {saving ? '保存中...' : '保存'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-4 px-4 py-3 items-center hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <div className="lg:col-span-2">
                        <span className="lg:hidden text-xs text-slate-400 mr-1">コード:</span>
                        <span className="text-sm font-mono text-slate-700 dark:text-slate-300">{item.code}</span>
                      </div>
                      <div className="lg:col-span-3">
                        <span className="lg:hidden text-xs text-slate-400 mr-1">標準名:</span>
                        <span className="text-sm font-medium text-slate-900 dark:text-white">{item.standardName}</span>
                      </div>
                      <div className="lg:col-span-2">
                        <span className="lg:hidden text-xs text-slate-400 mr-1">JLAC10:</span>
                        <span className="text-sm font-mono text-slate-500 dark:text-slate-400">{item.jlac10 || '-'}</span>
                      </div>
                      <div className="lg:col-span-3">
                        <div className="flex flex-wrap gap-1">
                          {item.synonyms.length > 0 ? (
                            item.synonyms.map(s => (
                              <span key={s} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs rounded">
                                {s}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </div>
                      </div>
                      <div className="lg:col-span-1">
                        <span className="lg:hidden text-xs text-slate-400 mr-1">紐付:</span>
                        <span className="text-sm text-slate-500 dark:text-slate-400">{item.linkedItemsCount}</span>
                      </div>
                      <div className="lg:col-span-1 flex justify-end">
                        <button
                          onClick={() => startEditing(item)}
                          className="p-2 rounded-lg text-slate-400 hover:text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
                          aria-label="編集"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddForm(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">マスタ項目を追加</h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">コード</label>
                <input
                  type="text"
                  value={newItem.code || ''}
                  onChange={e => setNewItem(prev => ({ ...prev, code: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="例: HBA1C"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">標準名</label>
                <input
                  type="text"
                  value={newItem.standardName || ''}
                  onChange={e => setNewItem(prev => ({ ...prev, standardName: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="例: ヘモグロビンA1c"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">JLAC10コード</label>
                <input
                  type="text"
                  value={newItem.jlac10 || ''}
                  onChange={e => setNewItem(prev => ({ ...prev, jlac10: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="例: 3D045000002327101"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">同義語</label>
                <TagInput
                  tags={newItem.synonyms || []}
                  onChange={synonyms => setNewItem(prev => ({ ...prev, synonyms }))}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleAddItem}
                  disabled={saving || !newItem.code || !newItem.standardName}
                  className="flex items-center gap-2 px-6 py-2.5 bg-teal-500 text-white text-sm rounded-lg hover:bg-teal-600 disabled:opacity-50 font-medium"
                >
                  <Plus className="w-4 h-4" />
                  {saving ? '追加中...' : '追加'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
