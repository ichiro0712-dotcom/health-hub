'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Search,
  Plus,
  Save,
  X,
  Filter,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

interface HealthQuestion {
  id: string;
  questionId: string;
  sectionId: string;
  question: string;
  priority: 'high' | 'medium' | 'low';
  intent: string;
  extractionHints: string[];
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

const priorityColors: Record<string, string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const priorityLabels: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低',
};

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<HealthQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<HealthQuestion>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState<Partial<HealthQuestion>>({
    sectionId: '',
    question: '',
    priority: 'medium',
    intent: '',
    extractionHints: [],
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/health-questions');
      if (!res.ok) throw new Error('取得失敗');
      const data = await res.json();
      setQuestions(data.data || []);
    } catch {
      setError('質問の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const filteredQuestions = questions.filter(q => {
    const matchSearch =
      q.question.toLowerCase().includes(search.toLowerCase()) ||
      q.questionId.toLowerCase().includes(search.toLowerCase()) ||
      q.intent.toLowerCase().includes(search.toLowerCase());
    const matchPriority = priorityFilter === 'all' || q.priority === priorityFilter;
    return matchSearch && matchPriority;
  });

  const groupedBySections = filteredQuestions.reduce<Record<string, HealthQuestion[]>>((acc, q) => {
    if (!acc[q.sectionId]) acc[q.sectionId] = [];
    acc[q.sectionId].push(q);
    return acc;
  }, {});

  const startEditing = (q: HealthQuestion) => {
    setEditingId(q.id);
    setEditForm({ ...q });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/health-questions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error('保存失敗');
      setToast({ message: '保存しました', type: 'success' });
      setEditingId(null);
      fetchQuestions();
    } catch {
      setToast({ message: '保存に失敗しました', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (q: HealthQuestion) => {
    try {
      const res = await fetch(`/api/admin/health-questions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...q, isActive: !q.isActive }),
      });
      if (!res.ok) throw new Error('更新失敗');
      fetchQuestions();
    } catch {
      setToast({ message: '更新に失敗しました', type: 'error' });
    }
  };

  const handleAddQuestion = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/health-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newQuestion),
      });
      if (!res.ok) throw new Error('追加失敗');
      setToast({ message: '質問を追加しました', type: 'success' });
      setShowAddForm(false);
      setNewQuestion({ sectionId: '', question: '', priority: 'medium', intent: '', extractionHints: [], isActive: true });
      fetchQuestions();
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">質問マスタ</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            ヘルスヒアリングで使用する質問を管理します
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white text-sm rounded-lg hover:bg-teal-600 transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          質問を追加
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="質問文やIDで検索..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">全ての優先度</option>
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button onClick={fetchQuestions} className="mt-2 text-sm text-red-700 underline hover:no-underline">再試行</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
              <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-3" />
              <div className="space-y-2">
                <div className="h-12 w-full bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                <div className="h-12 w-full bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : Object.keys(groupedBySections).length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <HelpCircle className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
          <p className="text-slate-500 dark:text-slate-400">該当する質問が見つかりません</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedBySections).map(([sectionId, sectionQuestions]) => {
            const isExpanded = expandedSections.has(sectionId);
            return (
              <div
                key={sectionId}
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
              >
                <button
                  onClick={() => toggleSection(sectionId)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                    <h3 className="font-semibold text-slate-900 dark:text-white">{sectionId}</h3>
                    <span className="text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                      {sectionQuestions.length}件
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
                    {sectionQuestions.map(q => (
                      <div key={q.id} className="px-5 py-4">
                        {editingId === q.id ? (
                          <div className="space-y-3">
                            <input
                              value={editForm.question || ''}
                              onChange={e => setEditForm(prev => ({ ...prev, question: e.target.value }))}
                              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                              placeholder="質問文"
                            />
                            <div className="grid grid-cols-2 gap-3">
                              <select
                                value={editForm.priority || 'medium'}
                                onChange={e => setEditForm(prev => ({ ...prev, priority: e.target.value as HealthQuestion['priority'] }))}
                                className="px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                              >
                                <option value="high">高優先</option>
                                <option value="medium">中優先</option>
                                <option value="low">低優先</option>
                              </select>
                              <input
                                value={editForm.intent || ''}
                                onChange={e => setEditForm(prev => ({ ...prev, intent: e.target.value }))}
                                placeholder="インテント"
                                className="px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                              />
                            </div>
                            <input
                              value={(editForm.extractionHints || []).join(', ')}
                              onChange={e =>
                                setEditForm(prev => ({
                                  ...prev,
                                  extractionHints: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                                }))
                              }
                              placeholder="抽出ヒント（カンマ区切り）"
                              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
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
                          <div className="flex items-start justify-between gap-4">
                            <div
                              className="flex-1 cursor-pointer"
                              onClick={() => startEditing(q)}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs text-slate-400 font-mono">{q.questionId}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${priorityColors[q.priority]}`}>
                                  {priorityLabels[q.priority]}
                                </span>
                                {q.intent && (
                                  <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                                    {q.intent}
                                  </span>
                                )}
                              </div>
                              <p className={`text-sm ${q.isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500 line-through'}`}>
                                {q.question}
                              </p>
                              {q.extractionHints && q.extractionHints.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {q.extractionHints.map((hint, i) => (
                                    <span key={i} className="text-[10px] bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 px-1.5 py-0.5 rounded">
                                      {hint}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => handleToggleActive(q)}
                              className="flex-shrink-0 p-1"
                              aria-label={q.isActive ? '無効にする' : '有効にする'}
                            >
                              {q.isActive ? (
                                <ToggleRight className="w-6 h-6 text-teal-500" />
                              ) : (
                                <ToggleLeft className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Question Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddForm(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">新しい質問を追加</h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">セクションID</label>
                <input
                  value={newQuestion.sectionId || ''}
                  onChange={e => setNewQuestion(prev => ({ ...prev, sectionId: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="例: basic_health"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">質問文</label>
                <textarea
                  value={newQuestion.question || ''}
                  onChange={e => setNewQuestion(prev => ({ ...prev, question: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 resize-y"
                  placeholder="質問文を入力..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">優先度</label>
                  <select
                    value={newQuestion.priority || 'medium'}
                    onChange={e => setNewQuestion(prev => ({ ...prev, priority: e.target.value as HealthQuestion['priority'] }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="high">高</option>
                    <option value="medium">中</option>
                    <option value="low">低</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">インテント</label>
                  <input
                    value={newQuestion.intent || ''}
                    onChange={e => setNewQuestion(prev => ({ ...prev, intent: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="例: sleep_quality"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">抽出ヒント（カンマ区切り）</label>
                <input
                  value={(newQuestion.extractionHints || []).join(', ')}
                  onChange={e =>
                    setNewQuestion(prev => ({
                      ...prev,
                      extractionHints: e.target.value.split(',').map(s => s.trim()).filter(Boolean),
                    }))
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="例: 睡眠時間, 入眠時刻, 起床時刻"
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
                  onClick={handleAddQuestion}
                  disabled={saving || !newQuestion.question || !newQuestion.sectionId}
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
