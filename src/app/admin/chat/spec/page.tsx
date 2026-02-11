'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FileText, Clock, RefreshCw, ChevronDown } from 'lucide-react';

interface SpecDoc {
  id: string;
  label: string;
  filename: string;
  content: string;
  lastModified: string | null;
}

export default function AdminChatSpecPage() {
  const [specs, setSpecs] = useState<SpecDoc[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSpecs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/chat-spec');
      const data = await res.json();
      if (data.success && data.data) {
        setSpecs(data.data);
        if (!activeTab && data.data.length > 0) {
          setActiveTab(data.data[0].id);
        }
      } else {
        setError(data.error || '取得に失敗しました');
      }
    } catch {
      setError('仕様ドキュメントの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSpecs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeSpec = specs.find(s => s.id === activeTab);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">仕様ドキュメントを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
        <p className="text-red-600 dark:text-red-400 mb-3">{error}</p>
        <button
          onClick={fetchSpecs}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          再読み込み
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">AIチャット仕様</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            AIチャットの設計仕様ドキュメント（docsディレクトリのファイルをリアルタイム表示）
          </p>
        </div>
        <button
          onClick={fetchSpecs}
          className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          再読み込み
        </button>
      </div>

      {/* Tab selector */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {specs.map(spec => (
          <button
            key={spec.id}
            onClick={() => setActiveTab(spec.id)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === spec.id
                ? 'bg-teal-500 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            {spec.label}
          </button>
        ))}
      </div>

      {/* Active spec content */}
      {activeSpec && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-slate-400" />
              <div>
                <span className="font-mono text-sm text-slate-700 dark:text-slate-300">
                  docs/{activeSpec.filename}
                </span>
              </div>
            </div>
            {activeSpec.lastModified && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Clock className="w-3.5 h-3.5" />
                最終更新: {new Date(activeSpec.lastModified).toLocaleString('ja-JP')}
              </div>
            )}
          </div>

          {/* Markdown content */}
          <div className="p-6 lg:p-8">
            <article className="prose prose-slate dark:prose-invert max-w-none prose-headings:scroll-mt-20 prose-h1:text-2xl prose-h2:text-xl prose-h2:border-b prose-h2:border-slate-200 prose-h2:dark:border-slate-700 prose-h2:pb-2 prose-h3:text-lg prose-code:before:content-none prose-code:after:content-none prose-code:bg-slate-100 prose-code:dark:bg-slate-700 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-slate-900 prose-pre:dark:bg-slate-950 prose-table:text-sm prose-th:bg-slate-50 prose-th:dark:bg-slate-800/50 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {activeSpec.content}
              </ReactMarkdown>
            </article>
          </div>
        </div>
      )}

      {/* Table of Contents (collapsible) */}
      {activeSpec && <TableOfContents content={activeSpec.content} />}
    </div>
  );
}

function TableOfContents({ content }: { content: string }) {
  const [open, setOpen] = useState(false);

  const headings = content
    .split('\n')
    .filter(line => /^#{1,3}\s/.test(line))
    .map(line => {
      const match = line.match(/^(#{1,3})\s+(.+)/);
      if (!match) return null;
      return {
        level: match[1].length,
        text: match[2].replace(/[`*]/g, ''),
      };
    })
    .filter(Boolean) as { level: number; text: string }[];

  if (headings.length === 0) return null;

  return (
    <div className="mt-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
          目次（{headings.length}セクション）
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-6 pb-4 space-y-1">
          {headings.map((h, i) => (
            <div
              key={i}
              className="text-sm text-slate-600 dark:text-slate-400"
              style={{ paddingLeft: `${(h.level - 1) * 16}px` }}
            >
              <span className="text-slate-300 dark:text-slate-600 mr-2">
                {h.level === 1 ? '#' : h.level === 2 ? '##' : '###'}
              </span>
              {h.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
