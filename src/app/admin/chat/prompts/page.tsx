'use client';

import { useEffect, useState, useCallback } from 'react';
import { FileText, Save, RotateCcw, X, Search, Clock, Info } from 'lucide-react';

interface Prompt {
  id: string;
  key: string;
  label: string;
  value: string;
  category: string;
  description: string | null;
  isActive: boolean;
  updatedAt: string;
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-[slideUp_0.3s_ease-out] ${
      type === 'success'
        ? 'bg-teal-500 text-white'
        : 'bg-red-500 text-white'
    }`}>
      {message}
      <button onClick={onClose} className="ml-2 hover:opacity-80">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function AdminPromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchPrompts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/prompts?category=chat');
      if (!res.ok) throw new Error('取得失敗');
      const data = await res.json();
      setPrompts(data.data || []);
    } catch {
      setError('プロンプトの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  const handleSave = async () => {
    if (!editingPrompt) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/prompts`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: editingPrompt.key, value: editValue }),
      });
      if (!res.ok) throw new Error('保存失敗');
      setToast({ message: '保存しました', type: 'success' });
      setEditingPrompt(null);
      fetchPrompts();
    } catch {
      setToast({ message: '保存に失敗しました', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (key: string) => {
    if (!confirm('デフォルトに戻しますか？')) return;
    try {
      const res = await fetch(`/api/admin/prompts`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      if (!res.ok) throw new Error('リセット失敗');
      setToast({ message: 'デフォルトに戻しました', type: 'success' });
      fetchPrompts();
    } catch {
      setToast({ message: 'リセットに失敗しました', type: 'error' });
    }
  };

  const filteredPrompts = prompts.filter(
    p =>
      p.key.toLowerCase().includes(search.toLowerCase()) ||
      p.label.toLowerCase().includes(search.toLowerCase())
  );

  const placeholderDescriptions: Record<string, string> = {
    '{{userName}}': 'ユーザー名',
    '{{userProfile}}': 'ユーザーのプロフィール情報',
    '{{healthData}}': '最新のヘルスデータ',
    '{{chatHistory}}': 'チャット履歴',
    '{{currentDate}}': '今日の日付',
    '{{mode}}': 'チャットモード',
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">プロンプト管理</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          AIチャットで使用されるプロンプトテンプレートを管理します
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="キーまたはラベルで検索..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
        />
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button onClick={fetchPrompts} className="mt-2 text-sm text-red-700 underline hover:no-underline">再試行</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <div className="space-y-3">
                <div className="h-5 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                <div className="h-20 w-full bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPrompts.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>該当するプロンプトが見つかりません</p>
            </div>
          ) : (
            filteredPrompts.map(prompt => (
              <div
                key={prompt.id}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{prompt.label}</h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{prompt.key}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="w-3 h-3" />
                      {new Date(prompt.updatedAt).toLocaleDateString('ja-JP')}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      prompt.isActive
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                    }`}>
                      {prompt.isActive ? '有効' : '無効'}
                    </span>
                  </div>
                </div>

                {prompt.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{prompt.description}</p>
                )}

                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 mb-3">
                  <pre className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words font-mono leading-relaxed max-h-40 overflow-y-auto">
                    {prompt.value.slice(0, 500)}{prompt.value.length > 500 ? '...' : ''}
                  </pre>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingPrompt(prompt);
                      setEditValue(prompt.value);
                    }}
                    className="px-4 py-2 bg-teal-500 text-white text-sm rounded-lg hover:bg-teal-600 transition-colors font-medium"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => handleReset(prompt.key)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4 inline mr-1" />
                    デフォルトに戻す
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditingPrompt(null)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{editingPrompt.label}</h2>
                <p className="text-xs text-slate-400 font-mono">{editingPrompt.key}</p>
              </div>
              <button
                onClick={() => setEditingPrompt(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <textarea
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                rows={16}
                className="w-full p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-y"
              />

              {/* Placeholder descriptions */}
              <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">利用可能な変数</span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {Object.entries(placeholderDescriptions).map(([key, desc]) => (
                    <div key={key} className="text-xs">
                      <code className="text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-1 py-0.5 rounded">{key}</code>
                      <span className="text-slate-500 ml-1">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setEditingPrompt(null)}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-teal-500 text-white text-sm rounded-lg hover:bg-teal-600 transition-colors font-medium disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(1rem);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
