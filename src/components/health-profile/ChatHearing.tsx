'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Send, Loader2, X, ChevronDown, ChevronUp, CheckCircle2, Database, FileText, Activity, Moon, Heart, Pill } from 'lucide-react';
import { toast } from 'sonner';
import ChatProgress from './ChatProgress';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface SectionProgress {
  id: string;
  name: string;
  priority3: { total: number; completed: number };
  priority2: { total: number; completed: number };
  priority1: { total: number; completed: number };
}

interface Progress {
  overall: number;
  answeredCount: number;
  totalCount: number;
  sections: SectionProgress[];
}

// 外部データプレビューの型
interface ExtractedDataItem {
  source: string;
  field: string;
  value: string;
  questionId: string | null;
}

interface ExternalDataPreview {
  hasNewData: boolean;
  available: {
    healthRecord?: {
      hasNew: boolean;
      latestDate: string;
      title?: string;
      items: ExtractedDataItem[];
      texts: { type: string; content: string }[];
    };
    fitData?: {
      hasNew: boolean;
      period: string;
      items: ExtractedDataItem[];
    };
    detailedSleep?: {
      hasNew: boolean;
      period: string;
      items: ExtractedDataItem[];
    };
    hrvData?: {
      hasNew: boolean;
      period: string;
      items: ExtractedDataItem[];
    };
    supplement?: {
      hasNew: boolean;
      items: ExtractedDataItem[];
    };
  };
}

interface ChatHearingProps {
  onContentUpdated?: () => void;
}

// ユニークIDを生成
let messageIdCounter = 0;
function generateMessageId(): string {
  return `msg_${Date.now()}_${++messageIdCounter}`;
}

export default function ChatHearing({ onContentUpdated }: ChatHearingProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initializingMessage, setInitializingMessage] = useState('準備中...');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [showProgress, setShowProgress] = useState(true);
  const [showPriority3Complete, setShowPriority3Complete] = useState(false);
  const [priority3JustCompleted, setPriority3JustCompleted] = useState(false);
  const [externalData, setExternalData] = useState<ExternalDataPreview | null>(null);
  const [showExternalDataPrompt, setShowExternalDataPrompt] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 進捗情報を取得
  const fetchSessionInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/health-chat/session');
      if (!res.ok) throw new Error('Failed to fetch session');
      const data = await res.json();
      setProgress(data.progress);
      if (data.hasActiveSession && data.sessionStatus === 'paused') {
        setSessionId(data.sessionId);
        setSessionStatus(data.sessionStatus);
      }
    } catch (error) {
      console.error('Session fetch error:', error);
    }
  }, []);

  // 初期読み込み
  useEffect(() => {
    fetchSessionInfo();
  }, [fetchSessionInfo]);

  // メッセージ末尾へスクロール（チャットエリア内のみ）
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // 外部データを確認
  const checkExternalData = async () => {
    try {
      const res = await fetch('/api/health-chat/external-data');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.hasNewData) {
          setExternalData(data);
          return true;
        }
      }
    } catch (error) {
      console.error('External data check error:', error);
    }
    return false;
  };

  // 外部データを取り込む
  const importExternalData = async (sources: string[]) => {
    if (!sessionId) return;

    setIsImporting(true);
    try {
      const res = await fetch('/api/health-chat/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources, sessionId })
      });

      if (res.ok) {
        const data = await res.json();
        // 取り込み結果をメッセージとして追加
        if (data.questionsAnswered && data.questionsAnswered.length > 0) {
          const importedItems = data.questionsAnswered
            .map((q: { value: string }) => `・${q.value}`)
            .join('\n');

          setMessages(prev => [...prev, {
            id: generateMessageId(),
            role: 'assistant',
            content: `外部データから以下の情報を取り込みました：\n\n${importedItems}\n\n${data.summary}`
          }]);

          // 進捗を更新
          await fetchSessionInfo();
          onContentUpdated?.();
        }
        toast.success('外部データを取り込みました');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('外部データの取り込みに失敗しました');
    } finally {
      setIsImporting(false);
      setShowExternalDataPrompt(false);
    }
  };

  // チャット開始
  const startChat = async () => {
    setIsInitializing(true);
    setInitializingMessage('プロフィールを確認中...');

    try {
      // 少し遅延を入れてUIの更新を確実にする
      await new Promise(resolve => setTimeout(resolve, 100));

      const res = await fetch('/api/health-chat/session', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to start session');

      setInitializingMessage('チャットを準備中...');
      const data = await res.json();
      setSessionId(data.sessionId);
      setSessionStatus('active');

      // セッション再開時は既存メッセージを復元
      if (data.isResumed && data.messages) {
        const restoredMessages: Message[] = data.messages.map((m: { role: 'user' | 'assistant'; content: string }) => ({
          id: generateMessageId(),
          role: m.role,
          content: m.content
        }));
        setMessages(restoredMessages);
      } else {
        setMessages([{ id: generateMessageId(), role: 'assistant', content: data.welcomeMessage }]);
      }
      setIsOpen(true);

      // 外部データを確認
      setInitializingMessage('外部データを確認中...');
      const hasExternalData = await checkExternalData();
      if (hasExternalData) {
        setShowExternalDataPrompt(true);
      }
    } catch (error) {
      console.error('Start chat error:', error);
      toast.error('チャットの開始に失敗しました');
    } finally {
      setIsInitializing(false);
      setInitializingMessage('準備中...');
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
      const res = await fetch('/api/health-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          sessionId
        })
      });

      if (!res.ok) throw new Error('Failed to send message');

      const data = await res.json();
      setMessages(prev => [...prev, { id: generateMessageId(), role: 'assistant', content: data.response }]);
      setProgress(data.progress);
      setSessionStatus(data.sessionStatus);

      // 重要度3が完了した場合、確認ダイアログを表示
      if (data.allPriority3Complete && !priority3JustCompleted) {
        setPriority3JustCompleted(true);
        setShowPriority3Complete(true);
      }

      if (data.sessionStatus === 'paused') {
        onContentUpdated?.();
      }

      if (data.updatedContent) {
        onContentUpdated?.();
      }
    } catch (error) {
      console.error('Send message error:', error);
      toast.error('メッセージの送信に失敗しました');
      // 失敗したメッセージを削除して入力欄に戻す
      setMessages(prev => prev.filter(m => m.id !== userMessageId));
      setInputValue(userMessage);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  // 重要度3完了後、詳細質問を続ける
  const continueToDetailedQuestions = () => {
    setShowPriority3Complete(false);
    setMessages(prev => [...prev, {
      id: generateMessageId(),
      role: 'assistant',
      content: '素晴らしいです！基本的な質問が完了しました。\n\nここからは、より詳しい健康情報をお聞きしていきます。これらは任意ですが、記入いただくとより的確なアドバイスが可能になります。\n\n続けてよろしいですか？'
    }]);
  };

  // 重要度3完了後、ヒアリングを終了
  const finishAfterPriority3 = async () => {
    setShowPriority3Complete(false);
    setIsLoading(true);
    try {
      const res = await fetch('/api/health-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'ここまで保存して',
          sessionId
        })
      });

      if (!res.ok) throw new Error('Failed to save session');

      const data = await res.json();
      setMessages(prev => [...prev, { id: generateMessageId(), role: 'assistant', content: data.response }]);
      setProgress(data.progress);
      setSessionStatus(data.sessionStatus);
      onContentUpdated?.();
    } catch (error) {
      console.error('Save session error:', error);
      toast.error('保存に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // キーボードイベント（LINEライクな操作感）
  // Enter: 改行、Shift+Enter または送信ボタン: 送信
  // IME変換中（isComposing）は送信しない
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // IME変換中は何もしない
    if (e.nativeEvent.isComposing) return;

    // Shift+Enterで送信
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
    // 通常のEnterは改行（textareaのデフォルト動作）
  };

  // チャットを閉じる
  const closeChat = () => {
    setIsOpen(false);
    // セッションが一時停止された場合はリロードを促す
    if (sessionStatus === 'paused') {
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
            <h2 className="font-bold text-slate-800 dark:text-white">チャットヒアリング</h2>
          </div>
          {progress && (
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {progress.overall}% 完了
            </span>
          )}
        </div>

        {progress && (
          <div className="mb-4">
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
              <div
                className="bg-teal-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress.overall}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {progress.answeredCount}/{progress.totalCount} 質問回答済み
            </p>
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
              {initializingMessage}
            </>
          ) : sessionStatus === 'paused' ? (
            <>
              <MessageCircle className="w-4 h-4" />
              続きから再開する
            </>
          ) : (
            <>
              <MessageCircle className="w-4 h-4" />
              チャットで埋める
            </>
          )}
        </button>

        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
          AIと対話しながら健康プロフィールを埋めていきます
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
          <span className="font-bold">チャットヒアリング</span>
          {progress && (
            <span className="text-teal-100 text-sm ml-2">
              {progress.overall}%
            </span>
          )}
        </div>
        <button
          onClick={closeChat}
          className="p-1 hover:bg-teal-600 dark:hover:bg-teal-700 rounded transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 進捗バー */}
      {progress && (
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-600 dark:text-slate-400">
              全体進捗: {progress.answeredCount}/{progress.totalCount}
            </span>
            <button
              onClick={() => setShowProgress(!showProgress)}
              className="text-xs text-teal-600 dark:text-teal-400 flex items-center gap-1"
            >
              {showProgress ? (
                <>詳細を隠す <ChevronUp className="w-3 h-3" /></>
              ) : (
                <>詳細を見る <ChevronDown className="w-3 h-3" /></>
              )}
            </button>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div
              className="bg-teal-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.overall}%` }}
            />
          </div>
          {showProgress && (
            <div className="mt-2">
              <ChatProgress sections={progress.sections} />
            </div>
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
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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

      {/* 外部データ取り込み確認ダイアログ */}
      {showExternalDataPrompt && externalData && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border-t border-blue-200 dark:border-blue-700">
          <div className="flex items-center gap-2 mb-3">
            <Database className="w-5 h-5 text-blue-500" />
            <span className="font-bold text-blue-700 dark:text-blue-300">外部データが見つかりました</span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
            以下のデータを健康プロフィールに取り込めます：
          </p>

          <div className="space-y-2 mb-4">
            {externalData.available.healthRecord && (
              <div className="flex items-center gap-2 text-sm bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                <FileText className="w-4 h-4 text-green-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-slate-700 dark:text-slate-300">健康診断</span>
                  <span className="text-slate-500 dark:text-slate-400 ml-2">
                    {externalData.available.healthRecord.latestDate}
                    {externalData.available.healthRecord.title && ` - ${externalData.available.healthRecord.title}`}
                  </span>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {externalData.available.healthRecord.items.length}項目
                    {externalData.available.healthRecord.texts.length > 0 && ` + ${externalData.available.healthRecord.texts.length}件のコメント`}
                  </div>
                </div>
              </div>
            )}

            {externalData.available.fitData && (
              <div className="flex items-center gap-2 text-sm bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                <Activity className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-slate-700 dark:text-slate-300">フィットネスデータ</span>
                  <span className="text-slate-500 dark:text-slate-400 ml-2">
                    {externalData.available.fitData.period}
                  </span>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {externalData.available.fitData.items.map(i => i.field).join('、')}
                  </div>
                </div>
              </div>
            )}

            {externalData.available.detailedSleep && (
              <div className="flex items-center gap-2 text-sm bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                <Moon className="w-4 h-4 text-purple-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-slate-700 dark:text-slate-300">詳細睡眠データ</span>
                  <span className="text-slate-500 dark:text-slate-400 ml-2">
                    {externalData.available.detailedSleep.period}
                  </span>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {externalData.available.detailedSleep.items.map(i => i.field).join('、')}
                  </div>
                </div>
              </div>
            )}

            {externalData.available.hrvData && (
              <div className="flex items-center gap-2 text-sm bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                <Heart className="w-4 h-4 text-red-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-slate-700 dark:text-slate-300">HRVデータ</span>
                  <span className="text-slate-500 dark:text-slate-400 ml-2">
                    {externalData.available.hrvData.period}
                  </span>
                </div>
              </div>
            )}

            {externalData.available.supplement && (
              <div className="flex items-center gap-2 text-sm bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                <Pill className="w-4 h-4 text-teal-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-slate-700 dark:text-slate-300">サプリメント</span>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {externalData.available.supplement.items.length}種類
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                const sources: string[] = [];
                if (externalData.available.healthRecord) sources.push('healthRecord');
                if (externalData.available.fitData) sources.push('fitData');
                if (externalData.available.detailedSleep) sources.push('detailedSleep');
                if (externalData.available.hrvData) sources.push('hrvData');
                if (externalData.available.supplement) sources.push('supplement');
                importExternalData(sources);
              }}
              disabled={isImporting}
              className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  取り込み中...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  すべて取り込む
                </>
              )}
            </button>
            <button
              onClick={() => setShowExternalDataPrompt(false)}
              disabled={isImporting}
              className="flex-1 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-medium text-sm disabled:opacity-50"
            >
              あとで
            </button>
          </div>
        </div>
      )}

      {/* 重要度3完了確認ダイアログ */}
      {showPriority3Complete && (
        <div className="p-4 bg-teal-50 dark:bg-teal-900/30 border-t border-teal-200 dark:border-teal-700">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-teal-500" />
            <span className="font-bold text-teal-700 dark:text-teal-300">基本質問が完了しました！</span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            より詳しい情報を入力すると、より的確な健康アドバイスが可能になります。続けますか？
          </p>
          <div className="flex gap-2">
            <button
              onClick={continueToDetailedQuestions}
              className="flex-1 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors font-medium text-sm"
            >
              詳しい質問に答える
            </button>
            <button
              onClick={finishAfterPriority3}
              className="flex-1 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-medium text-sm"
            >
              ここで終了
            </button>
          </div>
        </div>
      )}

      {/* 入力エリア */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={sessionStatus === 'paused' ? 'チャットは保存されました' : 'メッセージを入力...'}
            disabled={isLoading || sessionStatus === 'paused' || showPriority3Complete}
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
            disabled={isLoading || !inputValue.trim() || sessionStatus === 'paused' || showPriority3Complete}
            className="p-2 bg-teal-500 text-white rounded-full hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
          Shift+Enter で送信 / 「ここまで保存して」で終了
        </p>
      </div>
    </div>
  );
}
