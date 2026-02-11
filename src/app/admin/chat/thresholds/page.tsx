'use client';

import { useEffect, useState, useCallback } from 'react';
import { Sliders, Save, X, AlertTriangle } from 'lucide-react';

interface ThresholdConfig {
  key: string;
  label: string;
  value: number;
  description: string;
  min: number;
  max: number;
  step: number;
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

const defaultThresholds: ThresholdConfig[] = [
  {
    key: 'chat.confidence_threshold_mode',
    label: 'モード判定 信頼度しきい値',
    value: 0.7,
    description: 'チャットモードの自動判定に必要な最低信頼度',
    min: 0,
    max: 1,
    step: 0.05,
  },
  {
    key: 'chat.confidence_threshold_extraction',
    label: 'データ抽出 信頼度しきい値',
    value: 0.6,
    description: 'ヘルスデータ抽出処理の最低信頼度',
    min: 0,
    max: 1,
    step: 0.05,
  },
  {
    key: 'chat.confidence_threshold_intent',
    label: 'インテント判定 信頼度しきい値',
    value: 0.75,
    description: 'ユーザーインテント判定に必要な最低信頼度',
    min: 0,
    max: 1,
    step: 0.05,
  },
  {
    key: 'chat.max_retry_count',
    label: '最大リトライ回数',
    value: 3,
    description: 'LLM呼び出しの最大リトライ回数',
    min: 1,
    max: 10,
    step: 1,
  },
  {
    key: 'chat.session_timeout_minutes',
    label: 'セッションタイムアウト（分）',
    value: 30,
    description: 'チャットセッションの自動終了時間',
    min: 5,
    max: 120,
    step: 5,
  },
];

export default function AdminThresholdsPage() {
  const [thresholds, setThresholds] = useState<ThresholdConfig[]>(defaultThresholds);
  const [originalValues, setOriginalValues] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchThresholds = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/prompts?category=chat');
      if (!res.ok) throw new Error('取得失敗');
      const data = await res.json();
      const prompts = data.data || [];
      const originals: Record<string, number> = {};
      const updated = defaultThresholds.map(t => {
        const found = prompts.find((p: { key: string; value: string }) => p.key === t.key);
        const val = found ? parseFloat(found.value) : t.value;
        originals[t.key] = val;
        return { ...t, value: isNaN(val) ? t.value : val };
      });
      setThresholds(updated);
      setOriginalValues(originals);
    } catch {
      setError('しきい値の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchThresholds();
  }, [fetchThresholds]);

  const updateThreshold = (key: string, value: number) => {
    setThresholds(prev =>
      prev.map(t => (t.key === key ? { ...t, value } : t))
    );
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const promises = thresholds.map(t =>
        fetch('/api/admin/prompts', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: t.key, value: String(t.value) }),
        })
      );
      const results = await Promise.all(promises);
      const allOk = results.every(r => r.ok);
      if (!allOk) throw new Error('一部の保存に失敗');
      setToast({ message: '全てのしきい値を保存しました', type: 'success' });
      fetchThresholds();
    } catch {
      setToast({ message: '保存に失敗しました', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = thresholds.some(t => t.value !== originalValues[t.key]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">しきい値設定</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            AIチャットの信頼度しきい値やタイムアウト値を調整します
          </p>
        </div>
        <button
          onClick={handleSaveAll}
          disabled={saving || !hasChanges}
          className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white text-sm rounded-lg hover:bg-teal-600 transition-colors font-medium disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? '保存中...' : '全て保存'}
        </button>
      </div>

      {hasChanges && (
        <div className="mb-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-700 dark:text-amber-300">未保存の変更があります</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              しきい値の変更はAIチャットの動作に直接影響します。変更内容を確認してから保存してください。
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button onClick={fetchThresholds} className="mt-2 text-sm text-red-700 underline hover:no-underline">再試行</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <div className="space-y-3">
                <div className="h-5 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                <div className="h-8 w-full bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {thresholds.map(threshold => {
            const isChanged = threshold.value !== originalValues[threshold.key];
            return (
              <div
                key={threshold.key}
                className={`bg-white dark:bg-slate-800 rounded-xl border p-6 transition-colors ${
                  isChanged
                    ? 'border-amber-300 dark:border-amber-700'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-teal-500" />
                      {threshold.label}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{threshold.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={threshold.value}
                      onChange={e => updateThreshold(threshold.key, parseFloat(e.target.value) || 0)}
                      min={threshold.min}
                      max={threshold.max}
                      step={threshold.step}
                      className="w-24 px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-right font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <input
                    type="range"
                    value={threshold.value}
                    onChange={e => updateThreshold(threshold.key, parseFloat(e.target.value))}
                    min={threshold.min}
                    max={threshold.max}
                    step={threshold.step}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-500"
                  />
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-slate-400">{threshold.min}</span>
                    <span className="text-xs text-slate-400">{threshold.max}</span>
                  </div>
                </div>
                {isChanged && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    変更前: {originalValues[threshold.key]}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
