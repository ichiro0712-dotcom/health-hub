'use client';

/**
 * ChatHearingV2 - AIチャットコンポーネント
 *
 * グローバルモーダルから呼び出される。マウント時に自動でセッション開始。
 *
 * 機能:
 * - 健康プロフィールの構築・改善
 * - 健康データの分析・アドバイス
 * - Health Hubの使い方サポート
 *
 * 高速起動:
 * - 既存セッションがあれば即座に表示
 * - 新規の場合はウェルカムメッセージ表示中にバックグラウンドでGoogle Docs同期
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Send, Loader2, X, RefreshCw, CloudOff, Cloud, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ProfileAction {
  type: 'ADD' | 'UPDATE' | 'DELETE' | 'NONE';
  section_id: string;
  target_text?: string;
  new_text?: string;
  reason: string;
  confidence: number;
}

interface SessionContext {
  hasProfile: boolean;
  hasRecords: boolean;
  profileSummary: string | null;
  synced: boolean;
}

interface ChatHearingV2Props {
  onContentUpdated?: () => void;
  onClose?: () => void;
}

// ユニークIDを生成
let messageIdCounter = 0;
function generateMessageId(): string {
  return `msg_${Date.now()}_${++messageIdCounter}`;
}

export default function ChatHearingV2({ onContentUpdated, onClose }: ChatHearingV2Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string | null>(null);
  const [context, setContext] = useState<SessionContext | null>(null);
  const [hasUpdates, setHasUpdates] = useState(false);
  const [pendingActions, setPendingActions] = useState<ProfileAction[]>([]);
  const [syncError, setSyncError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // メッセージ末尾へスクロール
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // バックグラウンドでGoogle Docsを同期
  const syncGoogleDocs = useCallback(async () => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch('/api/health-chat/v2/session', { method: 'POST' });
      if (!res.ok) throw new Error('Sync failed');
      const data = await res.json();
      setContext(data.context);
      return data.context;
    } catch (error) {
      console.error('Sync error:', error);
      setSyncError('Google Docsとの同期に失敗しました');
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // マウント時に自動でチャット開始
  useEffect(() => {
    const startChat = async () => {
      setIsInitializing(true);
      try {
        const res = await fetch('/api/health-chat/v2/session');
        if (!res.ok) throw new Error('Failed to start session');

        const data = await res.json();
        setSessionId(data.sessionId);
        setSessionStatus(data.status);
        setContext(data.context);

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

        if (!data.context.synced) {
          syncGoogleDocs();
        }
      } catch (error) {
        console.error('Start chat error:', error);
        toast.error('チャットの開始に失敗しました');
      } finally {
        setIsInitializing(false);
      }
    };

    startChat();
  }, [syncGoogleDocs]);

  // 新規セッション開始（履歴クリア）
  const startNewSession = async () => {
    setIsInitializing(true);
    setPendingActions([]);

    try {
      await fetch('/api/health-chat/v2/session', { method: 'DELETE' });

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
      setSyncError(null);

      syncGoogleDocs();

    } catch (error) {
      console.error('Start new session error:', error);
      toast.error('新規セッションの開始に失敗しました');
    } finally {
      setIsInitializing(false);
    }
  };

  // 手動同期ボタン
  const handleManualSync = async () => {
    const newContext = await syncGoogleDocs();
    if (newContext) {
      toast.success('データを同期しました');
    } else {
      toast.error('同期に失敗しました');
    }
  };

  // チャットを閉じる
  const handleClose = () => {
    if (hasUpdates || sessionStatus === 'paused') {
      onContentUpdated?.();
    }
    onClose?.();
  };

  // メッセージ送信（ストリーミング対応）
  const sendMessage = async (overrideMessage?: string) => {
    const messageToSend = overrideMessage || inputValue.trim();
    if (!messageToSend || isLoading) return;

    if (!overrideMessage) {
      setInputValue('');
    }
    const userMessageId = generateMessageId();
    const assistantMessageId = generateMessageId();

    setMessages(prev => [...prev, { id: userMessageId, role: 'user', content: messageToSend }]);
    setIsLoading(true);

    // pendingActionsがある場合の確認/拒否は通常APIを使用
    if (pendingActions.length > 0) {
      try {
        const res = await fetch('/api/health-chat/v2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: messageToSend,
            sessionId,
            pendingActionsToExecute: pendingActions
          })
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          if (res.status === 429) {
            toast.error('リクエストが多すぎます。少し待ってから再試行してください。');
            setMessages(prev => prev.filter(m => m.id !== userMessageId));
            if (!overrideMessage) setInputValue(messageToSend);
            return;
          }
          throw new Error(errorData.message || 'Failed to send message');
        }

        const data = await res.json();
        setPendingActions([]);
        setMessages(prev => [...prev, {
          id: assistantMessageId,
          role: 'assistant',
          content: data.response
        }]);
        setSessionStatus(data.sessionStatus);

        if (data.pendingActions && data.pendingActions.length > 0) {
          setPendingActions(data.pendingActions);
        }

        if (data.executedActions && data.executedActions.length > 0) {
          setHasUpdates(true);
          onContentUpdated?.();
        }

        if (data.syncStatus === 'failed') {
          setSyncError(data.syncError || 'Google Docsとの同期に失敗しました');
        } else if (data.syncStatus === 'synced') {
          setSyncError(null);
        }

        if (data.sessionStatus === 'paused') {
          onContentUpdated?.();
        }
      } catch (error) {
        console.error('Send message error:', error);
        toast.error('メッセージの送信に失敗しました');
        setMessages(prev => prev.filter(m => m.id !== userMessageId));
        if (!overrideMessage) setInputValue(messageToSend);
      } finally {
        setIsLoading(false);
        inputRef.current?.focus();
      }
      return;
    }

    // ストリーミングAPIを使用
    try {
      // 空のアシスタントメッセージを追加（ストリーミング用）
      setMessages(prev => [...prev, { id: assistantMessageId, role: 'assistant', content: '' }]);

      const res = await fetch('/api/health-chat/v2/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageToSend,
          sessionId
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 429) {
          toast.error('リクエストが多すぎます。少し待ってから再試行してください。');
          setMessages(prev => prev.filter(m => m.id !== userMessageId && m.id !== assistantMessageId));
          if (!overrideMessage) setInputValue(messageToSend);
          return;
        }
        throw new Error(errorData.message || 'Failed to send message');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.text) {
                accumulatedText += data.text;
                setMessages(prev =>
                  prev.map(m =>
                    m.id === assistantMessageId
                      ? { ...m, content: accumulatedText }
                      : m
                  )
                );
              }

              if (data.done) {
                setSessionId(data.sessionId);

                if (data.pendingActions && data.pendingActions.length > 0) {
                  setPendingActions(data.pendingActions);
                }

                if (data.executedActions && data.executedActions.length > 0) {
                  setHasUpdates(true);
                  onContentUpdated?.();
                }

                if (data.syncStatus === 'failed') {
                  setSyncError('Google Docsとの同期に失敗しました');
                  toast.error('Google Docsへの同期に失敗しました');
                } else if (data.syncStatus === 'synced') {
                  setSyncError(null);
                }
              }

              if (data.error) {
                toast.error(data.error);
              }
            } catch {
              // JSONパースエラーは無視
            }
          }
        }
      }
    } catch (error) {
      console.error('Send message error:', error);
      toast.error('メッセージの送信に失敗しました');
      setMessages(prev => prev.filter(m => m.id !== userMessageId && m.id !== assistantMessageId));
      if (!overrideMessage) setInputValue(messageToSend);
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

  return (
    <div className="flex flex-col h-full">
      {/* ヘッダー */}
      <div className="bg-teal-500 dark:bg-teal-600 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
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
          {/* 同期ボタン */}
          <button
            onClick={handleManualSync}
            disabled={isSyncing || isInitializing || isLoading}
            className="p-1 hover:bg-teal-600 dark:hover:bg-teal-700 rounded transition-colors"
            title={context?.synced ? 'データ同期済み' : 'Google Docsと同期'}
          >
            {isSyncing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : context?.synced ? (
              <Cloud className="w-4 h-4" />
            ) : (
              <CloudOff className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={startNewSession}
            disabled={isInitializing || isLoading}
            className="p-1 hover:bg-teal-600 dark:hover:bg-teal-700 rounded transition-colors"
            title="新規セッション"
          >
            <RefreshCw className={`w-4 h-4 ${isInitializing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-teal-600 dark:hover:bg-teal-700 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 同期エラーバー */}
      {syncError && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/30 border-b border-red-200 dark:border-red-700 text-xs text-red-700 dark:text-red-300 flex items-center gap-2 flex-shrink-0">
          <AlertTriangle className="w-3 h-3" />
          {syncError}
          <button
            onClick={handleManualSync}
            className="ml-auto text-red-700 dark:text-red-300 hover:underline font-medium"
          >
            再試行
          </button>
        </div>
      )}

      {/* 同期状態バー（未同期の場合のみ表示） */}
      {!context?.synced && !isSyncing && !syncError && (
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-700 text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between flex-shrink-0">
          <span>最新のGoogle Docsデータを読み込んでいません</span>
          <button
            onClick={handleManualSync}
            className="text-amber-700 dark:text-amber-300 hover:underline font-medium"
          >
            同期する
          </button>
        </div>
      )}

      {/* 同期中バー */}
      {isSyncing && (
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/30 border-b border-blue-200 dark:border-blue-700 text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2 flex-shrink-0">
          <Loader2 className="w-3 h-3 animate-spin" />
          Google Docsからデータを読み込み中...
        </div>
      )}

      {/* メッセージエリア */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900"
      >
        {isInitializing ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>

      {/* 保留中のアクションがある場合のクイックアクションボタン */}
      {pendingActions.length > 0 && !isLoading && (
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/30 border-t border-amber-200 dark:border-amber-700 flex items-center justify-center gap-3 flex-shrink-0">
          <span className="text-xs text-amber-700 dark:text-amber-300">
            確認が必要な更新があります
          </span>
          <button
            onClick={() => sendMessage('はい')}
            className="px-3 py-1 text-xs bg-teal-500 text-white rounded-full hover:bg-teal-600 transition-colors"
          >
            はい
          </button>
          <button
            onClick={() => sendMessage('いいえ')}
            className="px-3 py-1 text-xs bg-slate-400 text-white rounded-full hover:bg-slate-500 transition-colors"
          >
            いいえ
          </button>
        </div>
      )}

      {/* 入力エリア */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={sessionStatus === 'paused' ? 'セッションは保存されました' : 'メッセージを入力...'}
            disabled={isLoading || sessionStatus === 'paused' || isInitializing}
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
            onClick={() => sendMessage()}
            disabled={isLoading || !inputValue.trim() || sessionStatus === 'paused' || isInitializing}
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
