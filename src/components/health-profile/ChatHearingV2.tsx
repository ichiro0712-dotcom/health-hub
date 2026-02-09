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
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { useChatModal } from '@/contexts/ChatModalContext';

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

interface ProfileIssue {
  type: 'DUPLICATE' | 'CONFLICT' | 'OUTDATED';
  sectionId: string;
  description: string;
  existingTexts: string[];
  suggestedResolution: string;
  suggestedAction: ProfileAction;
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
  isVisible?: boolean;
}

// 1件のissueに対する整理提案メッセージを生成
function buildSingleIssueProposal(issue: ProfileIssue, current: number, total: number): string {
  const label = issue.type === 'DUPLICATE' ? '重複' : issue.type === 'CONFLICT' ? '矛盾' : '古い情報';
  const action = issue.suggestedAction;

  let proposalText = `プロフィールに**${label}**が見つかりました（${current}/${total}件）：\n\n`;
  proposalText += `${issue.description}\n\n`;

  if (action && action.type !== 'NONE') {
    if (action.type === 'DELETE') {
      proposalText += `**修正案**: 以下を削除します\n`;
      proposalText += `「${action.target_text}」\n\n`;
    } else if (action.type === 'UPDATE') {
      proposalText += `**修正案**: 以下のように更新します\n`;
      if (action.target_text) {
        proposalText += `変更前: 「${action.target_text}」\n`;
      }
      proposalText += `変更後: 「${action.new_text}」\n\n`;
    }
    proposalText += `こう修正しますか？「はい」で修正、「スキップ」で次へ進みます。`;
  } else {
    proposalText += `→ ${issue.suggestedResolution}`;
  }

  return proposalText;
}

export default function ChatHearingV2({ onContentUpdated, onClose, isVisible }: ChatHearingV2Props) {
  const { setIsAIResponding } = useChatModal();
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
  const [analyzerIssues, setAnalyzerIssues] = useState<ProfileIssue[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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

  // モーダル再表示時にスクロール位置を末尾に復元 + 入力欄にフォーカス
  useEffect(() => {
    if (isVisible && messagesContainerRef.current) {
      requestAnimationFrame(() => {
        messagesContainerRef.current!.scrollTop = messagesContainerRef.current!.scrollHeight;
        inputRef.current?.focus();
      });
    }
  }, [isVisible]);

  // isLoading変化時にChatModalContextに伝達（バックグラウンド動作フィードバック用）
  useEffect(() => {
    setIsAIResponding(isLoading);
  }, [isLoading, setIsAIResponding]);

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

        // アナライザー結果（新規セッション時のみ返される）
        if (data.analyzerResult?.issues?.length > 0) {
          setAnalyzerIssues(data.analyzerResult.issues);
        }

        if (data.messages && data.messages.length > 0) {
          // 既存セッション再開（Analyzerは実行されない）
          const restoredMessages: Message[] = data.messages.map((m: { id: string; role: 'user' | 'assistant'; content: string }) => ({
            id: m.id || generateMessageId(),
            role: m.role,
            content: m.content
          }));
          setMessages(restoredMessages);
        } else {
          // 新規セッション: ウェルカムメッセージ表示
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
      setAnalyzerIssues(data.analyzerResult?.issues || []);
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

  // 手動同期ボタン（同期 + プロフィールチェック）
  const handleManualSync = async () => {
    const newContext = await syncGoogleDocs();
    if (!newContext) {
      toast.error('同期に失敗しました');
      return;
    }
    toast.success('データを同期しました');

    // 同期後にプロフィールチェック（Analyzer）を実行
    setIsAnalyzing(true);
    try {
      const res = await fetch(`/api/health-chat/v2/session/analyze`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.analyzerResult?.issues?.length > 0) {
          const issues = data.analyzerResult.issues as ProfileIssue[];
          setAnalyzerIssues(issues);
          // 1件目の整理提案メッセージをチャットに追加
          setMessages(prev => [...prev, {
            id: generateMessageId(),
            role: 'assistant' as const,
            content: buildSingleIssueProposal(issues[0], 1, issues.length)
          }]);
        } else {
          setAnalyzerIssues([]);
          toast.success('プロフィールに問題は見つかりませんでした');
        }
      }
    } catch (error) {
      console.error('Analyzer error:', error);
    } finally {
      setIsAnalyzing(false);
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

    // 前のストリーミングが残っていたらキャンセル（モーダル閉じ→開き→送信時の競合防止）
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

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

    // pendingActionsがある場合 or analyzerIssues確認/拒否は通常APIを使用
    if (pendingActions.length > 0 || analyzerIssues.length > 0) {
      try {
        const res = await fetch('/api/health-chat/v2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: messageToSend,
            sessionId,
            pendingActionsToExecute: pendingActions.length > 0 ? pendingActions : undefined,
            // 1件目のissueのみ送信（1件ずつ処理）
            analyzerIssues: analyzerIssues.length > 0 ? [analyzerIssues[0]] : undefined,
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

        // issue処理後: 1件目を消して次のissueを提案（または完了）
        if (data.issueProcessed && analyzerIssues.length > 0) {
          const remaining = analyzerIssues.slice(1);
          setAnalyzerIssues(remaining);
          if (remaining.length > 0) {
            const nextIdx = analyzerIssues.length - remaining.length + 1;
            setMessages(prev => [...prev, {
              id: generateMessageId(),
              role: 'assistant' as const,
              content: buildSingleIssueProposal(remaining[0], nextIdx, analyzerIssues.length)
            }]);
          }
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
          sessionId,
          // 1件目のissueのみ送信（1件ずつ処理）
          analyzerIssues: analyzerIssues.length > 0 ? [analyzerIssues[0]] : undefined,
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
      let sseBuffer = ''; // SSEチャンクバッファリング（行の途中切れ対策）

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        sseBuffer += chunk;
        const lines = sseBuffer.split('\n');
        // 最後の行が不完全な可能性があるのでバッファに残す
        sseBuffer = lines.pop() || '';

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

                // issue処理後: 1件目を消して次のissueを提案（または完了）
                if (data.issueProcessed && analyzerIssues.length > 0) {
                  const remaining = analyzerIssues.slice(1);
                  setAnalyzerIssues(remaining);
                  if (remaining.length > 0) {
                    // 次のissueを提案
                    const nextIdx = analyzerIssues.length - remaining.length + 1;
                    setMessages(prev => [...prev, {
                      id: generateMessageId(),
                      role: 'assistant' as const,
                      content: buildSingleIssueProposal(remaining[0], nextIdx, analyzerIssues.length)
                    }]);
                  }
                }

                // プロフィールチェック要求で新たにissuesが返された場合
                if (data.analyzerIssues && data.analyzerIssues.length > 0) {
                  const issues = data.analyzerIssues as ProfileIssue[];
                  setAnalyzerIssues(issues);
                  setMessages(prev => [...prev, {
                    id: generateMessageId(),
                    role: 'assistant' as const,
                    content: buildSingleIssueProposal(issues[0], 1, issues.length)
                  }]);
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
            disabled={isSyncing || isAnalyzing || isInitializing || isLoading}
            className="flex items-center gap-1 px-2 py-1 hover:bg-teal-600 dark:hover:bg-teal-700 rounded transition-colors text-xs"
            title={context?.synced ? 'データ同期済み（プロフィールチェックも実行）' : 'Google Docsと同期 + プロフィールチェック'}
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

      {/* プロフィールチェック中バー */}
      {isAnalyzing && (
        <div className="px-4 py-2 bg-purple-50 dark:bg-purple-900/30 border-b border-purple-200 dark:border-purple-700 text-xs text-purple-700 dark:text-purple-300 flex items-center gap-2 flex-shrink-0">
          <Loader2 className="w-3 h-3 animate-spin" />
          健康プロフィールをチェック中...
        </div>
      )}

      {/* プロフィール重複・矛盾の検出結果 */}
      {analyzerIssues.length > 0 && (
        <div className="px-4 py-2 bg-orange-50 dark:bg-orange-900/30 border-b border-orange-200 dark:border-orange-700 flex-shrink-0">
          <p className="text-xs font-medium text-orange-700 dark:text-orange-300 mb-1">
            プロフィールに整理が必要な箇所があります:
          </p>
          <ul className="text-xs text-orange-600 dark:text-orange-400 space-y-0.5 ml-3">
            {analyzerIssues.map((issue, i) => (
              <li key={i}>
                {issue.type === 'DUPLICATE' ? '📋' : issue.type === 'CONFLICT' ? '⚠️' : '🕐'}{' '}
                {issue.description}
              </li>
            ))}
          </ul>
          <button
            onClick={() => setAnalyzerIssues([])}
            className="mt-1 text-[10px] text-orange-500 dark:text-orange-400 hover:underline"
          >
            閉じる
          </button>
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
                  <div className="text-sm prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-hr:my-2">
                    {message.content ? (
                      <ReactMarkdown
                        components={{
                          a: ({ href, children }) => {
                            if (href?.startsWith('/')) {
                              return (
                                <Link href={href} className="text-teal-600 dark:text-teal-400 underline hover:text-teal-700 dark:hover:text-teal-300">
                                  {children}
                                </Link>
                              );
                            }
                            return <a href={href} target="_blank" rel="noopener noreferrer" className="text-teal-600 dark:text-teal-400 underline">{children}</a>;
                          },
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    ) : (
                      // タイピングインジケーター（ストリーミング中でテキストがまだ空の場合）
                      <span className="inline-flex gap-1">
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                    )}
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

      {/* issue整理の確認ボタン */}
      {analyzerIssues.length > 0 && pendingActions.length === 0 && !isLoading && (
        <div className="px-4 py-2 bg-orange-50 dark:bg-orange-900/30 border-t border-orange-200 dark:border-orange-700 flex-shrink-0">
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => sendMessage('はい')}
              className="px-4 py-1.5 text-xs bg-teal-500 text-white rounded-full hover:bg-teal-600 transition-colors font-medium"
            >
              修正する
            </button>
            <button
              onClick={() => sendMessage('スキップ')}
              className="px-4 py-1.5 text-xs bg-slate-400 text-white rounded-full hover:bg-slate-500 transition-colors font-medium"
            >
              スキップ
            </button>
          </div>
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
