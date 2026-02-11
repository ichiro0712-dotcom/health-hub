'use client';

import { useEffect, useState, useCallback } from 'react';
import { MessageCircle, Save, X } from 'lucide-react';

interface GreetingPrompt {
  id: string;
  key: string;
  label: string;
  value: string;
  updatedAt: string;
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

function ChatBubblePreview({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 mt-3">
      <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0">
        <MessageCircle className="w-4 h-4 text-white" />
      </div>
      <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 max-w-md">
        <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
          {text || '(プレビューなし)'}
        </p>
      </div>
    </div>
  );
}

export default function AdminGreetingsPage() {
  const [greetings, setGreetings] = useState<GreetingPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchGreetings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/prompts?category=chat');
      if (!res.ok) throw new Error('取得失敗');
      const data = await res.json();
      const allPrompts = data.data || [];
      const filtered = allPrompts.filter(
        (p: GreetingPrompt) =>
          p.key.startsWith('chat.greeting_') || p.key.startsWith('chat.session_end_')
      );
      setGreetings(filtered);
      const initialValues: Record<string, string> = {};
      filtered.forEach((g: GreetingPrompt) => {
        initialValues[g.key] = g.value;
      });
      setEditedValues(initialValues);
    } catch {
      setError('挨拶文の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGreetings();
  }, [fetchGreetings]);

  const handleSave = async (key: string) => {
    setSavingKeys(prev => new Set(prev).add(key));
    try {
      const res = await fetch('/api/admin/prompts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: editedValues[key] }),
      });
      if (!res.ok) throw new Error('保存失敗');
      setToast({ message: '保存しました', type: 'success' });
      fetchGreetings();
    } catch {
      setToast({ message: '保存に失敗しました', type: 'error' });
    } finally {
      setSavingKeys(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">挨拶文設定</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          チャット開始時の挨拶やセッション終了メッセージを管理します
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button onClick={fetchGreetings} className="mt-2 text-sm text-red-700 underline hover:no-underline">再試行</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <div className="space-y-3">
                <div className="h-5 w-40 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                <div className="h-24 w-full bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                <div className="h-10 w-full bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : greetings.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <MessageCircle className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-slate-500 dark:text-slate-400">挨拶文が設定されていません</p>
        </div>
      ) : (
        <div className="space-y-6">
          {greetings.map(greeting => {
            const isSaving = savingKeys.has(greeting.key);
            const currentValue = editedValues[greeting.key] ?? greeting.value;
            const isChanged = currentValue !== greeting.value;

            return (
              <div
                key={greeting.id}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{greeting.label}</h3>
                    <p className="text-xs text-slate-400 font-mono">{greeting.key}</p>
                  </div>
                  {isChanged && (
                    <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">
                      未保存の変更
                    </span>
                  )}
                </div>

                <textarea
                  value={currentValue}
                  onChange={e =>
                    setEditedValues(prev => ({ ...prev, [greeting.key]: e.target.value }))
                  }
                  rows={4}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-y"
                />

                {/* Preview */}
                <div className="mt-3 mb-4">
                  <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">プレビュー</p>
                  <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4">
                    <ChatBubblePreview text={currentValue} />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => handleSave(greeting.key)}
                    disabled={isSaving || !isChanged}
                    className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white text-sm rounded-lg hover:bg-teal-600 transition-colors font-medium disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
