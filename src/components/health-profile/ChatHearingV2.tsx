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

import { useState, useEffect, useRef, useCallback, Fragment } from 'react';
import { MessageCircle, Send, Loader2, X, RefreshCw, CloudOff, Cloud, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

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

// 内部リンクのパターン: → /path or /path 形式を検出
const LINK_PATTERN = /(?:→\s*)?(\/([\w\-\/]+))/g;

function renderLineWithLinks(line: string, lineIndex: number): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  const regex = new RegExp(LINK_PATTERN.source, 'g');
  let match;

  while ((match = regex.exec(line)) !== null) {
    // マッチ前のテキスト
    if (match.index > lastIndex) {
      parts.push(line.slice(lastIndex, match.index));
    }
    const path = match[1];
    parts.push(
      <Link
        key={`${lineIndex}-${match.index}`}
        href={path}
        className="text-teal-600 dark:text-teal-400 underline hover:text-teal-700 dark:hover:text-teal-300"
      >
        {path}
      </Link>
    );
    lastIndex = regex.lastIndex;
  }

  // 残りのテキスト
  if (lastIndex < line.length) {
    parts.push(line.slice(lastIndex));
  }

  return parts.length > 0 ? parts : line;
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
  const [chatMode, setChatMode] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messageIdRef = useRef(0);

  // ユニークIDを生成（インスタンスごとにrefで管理）
  const generateMessageId = useCallback(() => {
    return `msg_${Date.now()}_${++messageIdRef.current}`;
  }, []);

  // メッセージ末尾へスクロール
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // アンマウント時にストリーミングをキャンセル
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

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
        if (data.mode) setChatMode(data.mode);

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
  }, [syncGoogleDocs, generateMessageId]);

  // 新規セッション開始（履歴クリア）- 確認ダイアログ付き
  const startNewSession = async () => {
    if (messages.length > 1 && !confirm('現在の会話をリセットして新しいチャットを始めますか？')) {
      return;
    }

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
      setChatMode(data.mode || null);
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

  // ストリーミング中かどうかを判定（空のアシスタントメッセージがある = ストリーミング開始直後）
  const isStreaming = isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'assistant';

  // メッセージ送信（ストリーミング対応）
  const sendMessage = async (overrideMessage?: string) => {
    const messageToSend = overrideMessage || inputValue.trim();
    if (!messageToSend || isLoading) return;

    if (!overrideMessage) {
      setInputValue('');
      // テキストエリアの高さをリセット
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
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
        if (data.mode) setChatMode(data.mode);
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
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // 空のアシスタントメッセージを追加（ストリーミング用）
      setMessages(prev => [...prev, { id: assistantMessageId, role: 'assistant', content: '' }]);

      const res = await fetch('/api/health-chat/v2/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageToSend,
          sessionId
        }),
        signal: controller.signal
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
                if (data.mode) setChatMode(data.mode);

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
      if (error instanceof DOMException && error.name === 'AbortError') {
        // ユーザーによるキャンセル（アンマウント時）- 正常
        return;
      }
      console.error('Send message error:', error);
      toast.error('メッセージの送信に失敗しました');
      setMessages(prev => prev.filter(m => m.id !== userMessageId && m.id !== assistantMessageId));
      if (!overrideMessage) setInputValue(messageToSend);
    } finally {
      abortControllerRef.current = null;
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  // キーボードイベント: Enter送信 / Shift+Enter改行
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.nativeEvent.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) {
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
          <span className="font-bold">H-Hubアシスタント</span>
          {chatMode && (
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">
              {chatMode === 'profile_building' ? 'プロフィール構築' : chatMode === 'data_analysis' ? 'データ分析' : '使い方'}
            </span>
          )}
          {hasUpdates && (
            <span className="text-xs bg-teal-400/50 px-2 py-0.5 rounded-full">
              更新あり
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* 同期ボタン */}
          <button
            onClick={handleManualSync}
            disabled={isSyncing || isInitializing || isLoading}
            className="flex items-center gap-1 px-2 py-1 hover:bg-teal-600 dark:hover:bg-teal-700 rounded transition-colors text-xs"
            title={context?.synced ? 'データ同期済み' : 'Google Docsと同期'}
          >
            {isSyncing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : context?.synced ? (
              <Cloud className="w-4 h-4" />
            ) : (
              <CloudOff className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">{isSyncing ? '同期中' : '同期'}</span>
          </button>
          <button
            onClick={startNewSession}
            disabled={isInitializing || isLoading}
            className="flex items-center gap-1 px-2 py-1 hover:bg-teal-600 dark:hover:bg-teal-700 rounded transition-colors text-xs"
            title="新規セッション"
          >
            <RefreshCw className={`w-4 h-4 ${isInitializing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">新規</span>
          </button>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-teal-600 dark:hover:bg-teal-700 rounded transition-colors ml-1"
            title="閉じる"
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
                    {message.content.split('\n').map((line, i, arr) => {
                      if (line.startsWith('**') && line.endsWith('**')) {
                        return <strong key={i} className="block font-bold">{line.slice(2, -2)}</strong>;
                      }
                      if (line.startsWith('---')) {
                        return <hr key={i} className="my-2 border-slate-300 dark:border-slate-600" />;
                      }
                      return (
                        <Fragment key={i}>
                          {renderLineWithLinks(line, i)}
                          {i < arr.length - 1 && <br />}
                        </Fragment>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
            {/* ストリーミング中はテキストが流れるのでスピナー不要。非ストリーミング（pendingActions処理中）のみ表示 */}
            {isLoading && !isStreaming && (
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

      {/* セッション保存済みガイド */}
      {sessionStatus === 'paused' && !isLoading && (
        <div className="px-4 py-3 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 text-center flex-shrink-0">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            セッションは保存されました
          </p>
          <button
            onClick={startNewSession}
            className="mt-2 px-4 py-1.5 text-sm bg-teal-500 text-white rounded-full hover:bg-teal-600 transition-colors"
          >
            新しいチャットを始める
          </button>
        </div>
      )}

      {/* 保留中のアクションがある場合のクイックアクションボタン */}
      {pendingActions.length > 0 && !isLoading && (
        <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/30 border-t border-amber-200 dark:border-amber-700 flex-shrink-0">
          <div className="text-xs text-amber-700 dark:text-amber-300 mb-2">
            <span className="font-medium">確認が必要な更新:</span>
            <ul className="mt-1 space-y-0.5 ml-3">
              {pendingActions.map((action, i) => (
                <li key={i}>
                  {action.type === 'ADD' ? '追加' : action.type === 'UPDATE' ? '更新' : '削除'}
                  : {action.new_text || action.target_text || action.reason}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => sendMessage('はい')}
              className="px-4 py-1.5 text-xs bg-teal-500 text-white rounded-full hover:bg-teal-600 transition-colors font-medium"
            >
              更新する
            </button>
            <button
              onClick={() => sendMessage('いいえ')}
              className="px-4 py-1.5 text-xs bg-slate-400 text-white rounded-full hover:bg-slate-500 transition-colors font-medium"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* 入力エリア */}
      {sessionStatus !== 'paused' && (
        <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="メッセージを入力..."
              disabled={isLoading || isInitializing}
              rows={2}
              className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-2xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 disabled:opacity-50 resize-none min-h-[52px] max-h-[120px] overflow-y-auto"
              style={{ height: 'auto' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 120) + 'px';
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={isLoading || !inputValue.trim() || isInitializing}
              className="p-2.5 bg-teal-500 text-white rounded-full hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 text-center hidden sm:block">
            Enter で送信 / Shift+Enter で改行
          </p>
        </div>
      )}
    </div>
  );
}
