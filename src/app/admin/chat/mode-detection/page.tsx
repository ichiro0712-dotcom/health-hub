'use client';

import { useEffect, useState, useCallback } from 'react';
import { Brain, Plus, Trash2, Save, X, AlertCircle } from 'lucide-react';

interface ModeRule {
  id: string;
  pattern: string;
  mode: string;
  confidence: number;
  label: string;
}

const MODES = [
  { value: 'health_hearing', label: 'ヘルスヒアリング' },
  { value: 'general_chat', label: '一般チャット' },
  { value: 'advice', label: 'アドバイス' },
  { value: 'data_query', label: 'データ問合せ' },
  { value: 'profile_edit', label: 'プロフィール編集' },
];

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

export default function AdminModeDetectionPage() {
  const [rules, setRules] = useState<ModeRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/prompts?key=chat.mode_detection_rules');
      if (!res.ok) throw new Error('取得失敗');
      const data = await res.json();
      const promptData = (data.data || [])[0] || data;
      if (promptData?.value) {
        const parsed = JSON.parse(promptData.value);
        setRules(Array.isArray(parsed) ? parsed : parsed.rules || []);
      } else {
        setRules([]);
      }
    } catch {
      setError('ルールの取得に失敗しました');
      setRules([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const addRule = () => {
    setRules(prev => [
      ...prev,
      {
        id: `rule_${Date.now()}`,
        pattern: '',
        mode: 'general_chat',
        confidence: 0.8,
        label: '',
      },
    ]);
  };

  const removeRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
  };

  const updateRule = (id: string, field: keyof ModeRule, value: string | number) => {
    setRules(prev =>
      prev.map(r => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/prompts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: 'chat.mode_detection_rules',
          value: JSON.stringify(rules),
        }),
      });
      if (!res.ok) throw new Error('保存失敗');
      setToast({ message: '全ルールを保存しました', type: 'success' });
    } catch {
      setToast({ message: '保存に失敗しました', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const isValidRegex = (pattern: string): boolean => {
    if (!pattern) return true;
    try {
      new RegExp(pattern);
      return true;
    } catch {
      return false;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">モード検出ルール</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            チャットメッセージからモードを自動判定するルールを設定します
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={addRule}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300"
          >
            <Plus className="w-4 h-4" />
            ルール追加
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
          <button onClick={fetchRules} className="mt-2 text-sm text-red-700 underline hover:no-underline">再試行</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="flex gap-4">
                <div className="h-10 flex-1 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                <div className="h-10 w-40 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                <div className="h-10 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid md:grid-cols-12 gap-4 px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <div className="col-span-4">パターン (正規表現)</div>
            <div className="col-span-3">モード</div>
            <div className="col-span-2">信頼度</div>
            <div className="col-span-2">ラベル</div>
            <div className="col-span-1" />
          </div>

          {rules.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>ルールがありません</p>
              <button
                onClick={addRule}
                className="mt-3 text-sm text-teal-600 dark:text-teal-400 underline hover:no-underline"
              >
                最初のルールを追加
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {rules.map(rule => (
                <div key={rule.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-4 py-3 items-center">
                  <div className="md:col-span-4">
                    <label className="md:hidden text-xs font-medium text-slate-500 mb-1 block">パターン</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={rule.pattern}
                        onChange={e => updateRule(rule.id, 'pattern', e.target.value)}
                        placeholder="例: (?:健康|体調).*(?:相談|質問)"
                        className={`w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border rounded-lg text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                          !isValidRegex(rule.pattern) ? 'border-red-300 dark:border-red-700' : 'border-slate-200 dark:border-slate-700'
                        }`}
                      />
                      {!isValidRegex(rule.pattern) && (
                        <AlertCircle className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-3">
                    <label className="md:hidden text-xs font-medium text-slate-500 mb-1 block">モード</label>
                    <select
                      value={rule.mode}
                      onChange={e => updateRule(rule.id, 'mode', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      {MODES.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="md:hidden text-xs font-medium text-slate-500 mb-1 block">信頼度</label>
                    <input
                      type="number"
                      value={rule.confidence}
                      onChange={e => updateRule(rule.id, 'confidence', parseFloat(e.target.value) || 0)}
                      min={0}
                      max={1}
                      step={0.05}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="md:hidden text-xs font-medium text-slate-500 mb-1 block">ラベル</label>
                    <input
                      type="text"
                      value={rule.label}
                      onChange={e => updateRule(rule.id, 'label', e.target.value)}
                      placeholder="ルール名"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div className="md:col-span-1 flex justify-end">
                    <button
                      onClick={() => removeRule(rule.id)}
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
