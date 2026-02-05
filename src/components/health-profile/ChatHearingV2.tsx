'use client';

/**
 * ChatHearingV2 - 新アーキテクチャ対応チャットコンポーネント
 *
 * 変更点:
 * - v2 APIを使用（Google Docsを信頼できる情報源として使用）
 * - 進捗バーを廃止（固定質問リストに依存しない）
 * - シンプルなUI
 * - 検出された問題を表示
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Send, Loader2, X, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface SessionContext {
  hasProfile: boolean;
  hasRecords: boolean;
  profileSummary: string | null;
  profileCharCount: number;
  recordsCharCount: number;
}

interface ChatHearingV2Props {
  onContentUpdated?: () => void;
}

// ユニークIDを生成
let messageIdCounter = 0;
function generateMessageId(): string {
  return `msg_${Date.now()}_${++messageIdCounter}`;
}

export default function ChatHearingV2({ onContentUpdated }: ChatHearingV2Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string | null>(null);
  const [context, setContext] = useState<SessionContext | null>(null);
  const [hasUpdates, setHasUpdates] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // メッセージ末尾へスクロール
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // セッション情報を取得
  const fetchSessionInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/health-chat/v2/session');
      if (!res.ok) throw new Error('Failed to fetch session');
      const data = await res.json();

      if (data.status === 'paused') {
        setSessionId(data.sessionId);
        setSessionStatus('paused');
      }
      setContext(data.context);
    } catch (error) {
      console.error('Session fetch error:', error);
    }
  }, []);

  // 初期読み込み
  useEffect(() => {
    fetchSessionInfo();
  }, [fetchSessionInfo]);

  // チャット開始
  const startChat = async () => {
    setIsInitializing(true);

    try {
      const res = await fetch('/api/health-chat/v2/session');
      if (!res.ok) throw new Error('Failed to start session');

      const data = await res.json();
      setSessionId(data.sessionId);
      setSessionStatus('active');
      setContext(data.context);

      // メッセージを復元または新規作成
      if (data.messages && data.messages.length > 0) {
        const restoredMessages: Message[] = data.messages.map((m: { id: string; role: 'user' | 'assistant'; content: string }) => ({
          id: m.id || generateMessageId(),
          role: m.role,
          content: m.content
        }));
        setMessages(restoredMessages);
      } else {
        setMessages([{
          id: generateMessageId(),
          role: 'assistant',
          content: data.welcomeMessage
        }]);
      }

      setIsOpen(true);
    } catch (error) {
      console.error('Start chat error:', error);
      toast.error('チャットの開始に失敗しました');
    } finally {
      setIsInitializing(false);
    }
  };

  // 新規セッション開始（履歴クリア）
  const startNewSession = async () => {
    setIsInitializing(true);

    try {
      // 既存セッションをクリア
      await fetch('/api/health-chat/v2/session', { method: 'DELETE' });

      // 新規セッション開始
      const res = await fetch('/api/health-chat/v2/session');
      if (!res.ok) throw new Error('Failed to start new session');

      const data = await res.json();
      setSessionId(data.sessionId);
      setSessionStatus('active');
      setContext(data.context);
      setMessages([{
        id: generateMessageId(),
        role: 'assistant',
        content: data.welcomeMessage
      }]);
      setHasUpdates(false);
    } catch (error) {
      console.error('Start new session error:', error);
      toast.error('新規セッションの開始に失敗しました');
    } finally {
      setIsInitializing(false);
    }
  };

  // メッセージ送信
  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    const userMessageId = generateMessageId();
    setMessages(prev => [...prev, { id: userMessageId, role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/health-chat/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          sessionId
        })
      });

      if (!res.ok) throw new Error('Failed to send message');

      const data = await res.json();
      setMessages(prev => [...prev, {
        id: generateMessageId(),
        role: 'assistant',
        content: data.response
      }]);
      setSessionStatus(data.sessionStatus);

      // アクションが実行された場合
      if (data.executedActions && data.executedActions.length > 0) {
        setHasUpdates(true);
        onContentUpdated?.();
      }

      if (data.sessionStatus === 'paused') {
        onContentUpdated?.();
      }
    } catch (error) {
      console.error('Send message error:', error);
      toast.error('メッセージの送信に失敗しました');
      setMessages(prev => prev.filter(m => m.id !== userMessageId));
      setInputValue(userMessage);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  // キーボードイベント
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // チャットを閉じる
  const closeChat = () => {
    setIsOpen(false);
    if (hasUpdates || sessionStatus === 'paused') {
      onContentUpdated?.();
    }
  };

  // 未開始状態のボタン表示
  if (!isOpen) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-teal-500" />
            <h2 className="font-bold text-slate-800 dark:text-white">AIチャット</h2>
          </div>
          {context?.hasProfile && (
            <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              プロフィールあり
            </span>
          )}
        </div>

        {context && (
          <div className="mb-4 text-xs text-slate-500 dark:text-slate-400">
            {context.profileSummary || 'AIと対話しながら健康プロフィールを作成・更新できます'}
          </div>
        )}

        <button
          onClick={startChat}
          disabled={isInitializing}
          className="w-full flex items-center justify-center gap-2 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors font-medium disabled:opacity-50"
        >
          {isInitializing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              準備中...
            </>
          ) : sessionStatus === 'paused' ? (
            <>
              <MessageCircle className="w-4 h-4" />
              続きから再開する
            </>
          ) : (
            <>
              <MessageCircle className="w-4 h-4" />
              チャットを始める
            </>
          )}
        </button>

        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
          健康情報の追加・修正・質問ができます
        </p>
      </div>
    );
  }

  // チャット画面
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-teal-200 dark:border-teal-700 shadow-lg mb-4 overflow-hidden">
      {/* ヘッダー */}
      <div className="bg-teal-500 dark:bg-teal-600 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          <span className="font-bold">AIチャット</span>
          {hasUpdates && (
            <span className="text-xs bg-teal-400/50 px-2 py-0.5 rounded-full">
              更新あり
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={startNewSession}
            disabled={isInitializing || isLoading}
            className="p-1 hover:bg-teal-600 dark:hover:bg-teal-700 rounded transition-colors"
            title="新規セッション"
          >
            <RefreshCw className={`w-4 h-4 ${isInitializing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={closeChat}
            className="p-1 hover:bg-teal-600 dark:hover:bg-teal-700 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* コンテキスト情報 */}
      {context && (
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            {context.hasProfile ? (
              <><CheckCircle2 className="w-3 h-3 text-green-500" /> プロフィール読込済</>
            ) : (
              <><AlertCircle className="w-3 h-3 text-yellow-500" /> 新規作成モード</>
            )}
          </span>
          {context.hasRecords && (
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-500" /> 診断記録あり
            </span>
          )}
        </div>
      )}

      {/* メッセージエリア */}
      <div
        ref={messagesContainerRef}
        className="h-[50vh] min-h-[280px] max-h-[400px] overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-teal-500 text-white rounded-br-md'
                  : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-md'
              }`}
            >
              <div className="text-sm whitespace-pre-wrap">
                {/* マークダウンの見出しをスタイリング */}
                {message.content.split('\n').map((line, i) => {
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return <strong key={i} className="block font-bold">{line.slice(2, -2)}</strong>;
                  }
                  if (line.startsWith('---')) {
                    return <hr key={i} className="my-2 border-slate-300 dark:border-slate-600" />;
                  }
                  return <span key={i}>{line}{i < message.content.split('\n').length - 1 && <br />}</span>;
                })}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-bl-md px-4 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-teal-500" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 入力エリア */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={sessionStatus === 'paused' ? 'セッションは保存されました' : 'メッセージを入力...'}
            disabled={isLoading || sessionStatus === 'paused'}
            rows={1}
            className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-2xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:opacity-50 resize-none min-h-[40px] max-h-[120px] overflow-y-auto"
            style={{ height: 'auto' }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = Math.min(target.scrollHeight, 120) + 'px';
            }}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !inputValue.trim() || sessionStatus === 'paused'}
            className="p-2 bg-teal-500 text-white rounded-full hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
          Shift+Enter で送信 / 「保存して」で終了
        </p>
      </div>
    </div>
  );
}
