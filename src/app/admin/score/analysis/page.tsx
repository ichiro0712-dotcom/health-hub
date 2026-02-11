'use client';

import { useEffect, useState, useCallback } from 'react';
import { FileText, Save, X } from 'lucide-react';

interface AnalysisPrompt {
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

const PROMPT_KEYS = [
  { key: 'score.analysis_prompt', label: '分析プロンプト (v1)' },
  { key: 'score.analysis_prompt_v2', label: '分析プロンプト (v2)' },
  { key: 'score.advice_prompt', label: 'アドバイスプロンプト' },
];

export default function AdminScoreAnalysisPage() {
  const [prompts, setPrompts] = useState<AnalysisPrompt[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchPrompts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/prompts?category=score');
      if (!res.ok) throw new Error('取得失敗');
      const data = await res.json();
      const allPrompts = data.data || [];
      const matched: AnalysisPrompt[] = PROMPT_KEYS.map(pk => {
        const found = allPrompts.find((p: { key: string }) => p.key === pk.key);
        return {
          key: pk.key,
          label: pk.label,
          value: found?.value || '',
          updatedAt: found?.updatedAt || '',
        };
      });
      setPrompts(matched);
      const initial: Record<string, string> = {};
      matched.forEach(p => {
        initial[p.key] = p.value;
      });
      setEditedValues(initial);
    } catch {
      setError('プロンプトの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  const handleSave = async (key: string) => {
    setSavingKey(key);
    try {
      const res = await fetch('/api/admin/prompts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: editedValues[key] }),
      });
      if (!res.ok) throw new Error('保存失敗');
      setToast({ message: '保存しました', type: 'success' });
      fetchPrompts();
    } catch {
      setToast({ message: '保存に失敗しました', type: 'error' });
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">分析プロンプト管理</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          ヘルススコア分析とアドバイス生成のプロンプトを管理します
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button onClick={fetchPrompts} className="mt-2 text-sm text-red-700 underline hover:no-underline">再試行</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-4" />
              <div className="h-48 w-full bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {prompts.map(prompt => {
            const isSaving = savingKey === prompt.key;
            const currentValue = editedValues[prompt.key] ?? prompt.value;
            const isChanged = currentValue !== prompt.value;

            return (
              <div
                key={prompt.key}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-teal-500" />
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">{prompt.label}</h3>
                      <p className="text-xs text-slate-400 font-mono">{prompt.key}</p>
                    </div>
                  </div>
                  {isChanged && (
                    <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">
                      未保存
                    </span>
                  )}
                </div>

                <textarea
                  value={currentValue}
                  onChange={e =>
                    setEditedValues(prev => ({ ...prev, [prompt.key]: e.target.value }))
                  }
                  rows={12}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-y leading-relaxed"
                />

                <div className="flex items-center justify-between mt-4">
                  {prompt.updatedAt && (
                    <span className="text-xs text-slate-400">
                      最終更新: {new Date(prompt.updatedAt).toLocaleDateString('ja-JP')}
                    </span>
                  )}
                  <button
                    onClick={() => handleSave(prompt.key)}
                    disabled={isSaving || !isChanged}
                    className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white text-sm rounded-lg hover:bg-teal-600 transition-colors font-medium disabled:opacity-50 ml-auto"
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
