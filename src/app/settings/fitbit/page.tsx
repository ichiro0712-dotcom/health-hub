'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Activity,
  Link2,
  Unlink,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Clock,
  Heart,
  Moon,
  Loader2,
  ArrowLeft,
  Shield,
  Zap,
} from 'lucide-react';

interface FitbitStatus {
  connected: boolean;
  fitbitUserId: string | null;
  scopes: string[];
  expiresAt: string | null;
  lastSync: string | null;
  isExpired?: boolean;
}

interface SyncResult {
  success: boolean;
  syncedAt: string;
  errors: Array<{ type: string; message: string }>;
}

function FitbitSettingsContent() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [fitbitStatus, setFitbitStatus] = useState<FitbitStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  // Check for URL params from callback
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'connected') {
      setMessage({ type: 'success', text: 'Fitbitと連携しました！' });
      // Clear URL params
      router.replace('/settings/fitbit');
    } else if (error) {
      setMessage({ type: 'error', text: decodeURIComponent(error) });
      router.replace('/settings/fitbit');
    }
  }, [searchParams, router]);

  // Fetch Fitbit status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/fitbit/status');
      const data = await res.json();
      if (data.success) {
        setFitbitStatus(data);
      }
    } catch (error) {
      console.error('Status fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchStatus();
    }
  }, [session, fetchStatus]);

  // Auth check
  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  if (!session) {
    router.push('/');
    return null;
  }

  // Connect to Fitbit
  const handleConnect = () => {
    setIsConnecting(true);
    // Redirect to OAuth flow
    window.location.href = '/api/fitbit/auth';
  };

  // Disconnect from Fitbit
  const handleDisconnect = async () => {
    if (!confirm('Fitbit連携を解除しますか？\n保存済みのデータは削除されません。')) {
      return;
    }

    setIsDisconnecting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/fitbit/disconnect', { method: 'DELETE' });
      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Fitbit連携を解除しました' });
        setFitbitStatus({ connected: false, fitbitUserId: null, scopes: [], expiresAt: null, lastSync: null });
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '連携解除に失敗しました' });
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Sync data
  const handleSync = async () => {
    setIsSyncing(true);
    setMessage(null);
    setSyncResult(null);

    try {
      const res = await fetch('/api/fitbit/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Sync last 7 days
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
        }),
      });

      const data = await res.json();
      setSyncResult(data);

      if (data.success) {
        setMessage({ type: 'success', text: 'データを同期しました' });
        fetchStatus(); // Refresh status
      } else {
        setMessage({ type: 'error', text: data.error || '同期に失敗しました' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '同期に失敗しました' });
    } finally {
      setIsSyncing(false);
    }
  };

  // Format date for display
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('ja-JP');
  };

  // Scope display names
  const scopeLabels: Record<string, { name: string; icon: React.ReactNode }> = {
    activity: { name: '歩数・活動', icon: <Activity className="w-4 h-4" /> },
    heartrate: { name: '心拍数', icon: <Heart className="w-4 h-4" /> },
    sleep: { name: '睡眠', icon: <Moon className="w-4 h-4" /> },
    oxygen_saturation: { name: '血中酸素', icon: <Zap className="w-4 h-4" /> },
    respiratory_rate: { name: '呼吸数', icon: <Activity className="w-4 h-4" /> },
    temperature: { name: '体温', icon: <Activity className="w-4 h-4" /> },
    weight: { name: '体重', icon: <Activity className="w-4 h-4" /> },
    profile: { name: 'プロフィール', icon: <Shield className="w-4 h-4" /> },
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Activity className="w-6 h-6 text-teal-500" />
                Fitbit連携
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Fitbitデバイスと連携して詳細なデータを取得
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Message */}
        {message && (
          <div
            className={`p-4 rounded-lg flex items-start gap-3 ${
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                : message.type === 'error'
                ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
            }`}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Connection Status */}
        <section className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-teal-500" />
              </div>
            ) : fitbitStatus?.connected ? (
              <div className="space-y-6">
                {/* Connected State */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center">
                    <Link2 className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                      Fitbit連携中
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      ユーザーID: {fitbitStatus.fitbitUserId}
                    </p>
                  </div>
                </div>

                {/* Status Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      最終同期
                    </p>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {formatDate(fitbitStatus.lastSync)}
                    </p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      トークン有効期限
                    </p>
                    <p className={`text-sm font-medium ${
                      fitbitStatus.isExpired
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}>
                      {fitbitStatus.isExpired ? '期限切れ' : formatDate(fitbitStatus.expiresAt)}
                    </p>
                  </div>
                </div>

                {/* Scopes */}
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    許可された権限
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {fitbitStatus.scopes.map((scope) => {
                      const label = scopeLabels[scope];
                      return (
                        <span
                          key={scope}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 rounded text-xs"
                        >
                          {label?.icon}
                          {label?.name || scope}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="flex-1 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSyncing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        同期中...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-5 h-5" />
                        今すぐ同期
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDisconnect}
                    disabled={isDisconnecting}
                    className="px-4 py-3 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {isDisconnecting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Unlink className="w-5 h-5" />
                    )}
                    解除
                  </button>
                </div>

                {/* Sync Result */}
                {syncResult && (
                  <div className={`p-4 rounded-lg ${
                    syncResult.success
                      ? 'bg-green-50 dark:bg-green-900/20'
                      : 'bg-yellow-50 dark:bg-yellow-900/20'
                  }`}>
                    <p className={`text-sm font-medium ${
                      syncResult.success
                        ? 'text-green-700 dark:text-green-400'
                        : 'text-yellow-700 dark:text-yellow-400'
                    }`}>
                      同期完了: {new Date(syncResult.syncedAt).toLocaleString('ja-JP')}
                    </p>
                    {syncResult.errors.length > 0 && (
                      <ul className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
                        {syncResult.errors.map((err, i) => (
                          <li key={i}>• {err.type}: {err.message}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Not Connected State */
              <div className="text-center py-8 space-y-6">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto">
                  <Activity className="w-8 h-8 text-slate-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
                    Fitbitと連携
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">
                    Fitbitアカウントと連携することで、心拍変動(HRV)、
                    詳細な睡眠ステージ、秒単位の心拍数などの
                    より詳細なデータを取得できます。
                  </p>
                </div>

                <button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="px-8 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      接続中...
                    </>
                  ) : (
                    <>
                      <Link2 className="w-5 h-5" />
                      Fitbitと連携する
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Features Info */}
        <section className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700">
            <h2 className="font-semibold text-slate-700 dark:text-slate-200">
              Fitbit連携で取得できるデータ
            </h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Heart className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-300">心拍変動 (HRV)</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    RMSSD値による自律神経の状態を確認
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Moon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-300">詳細睡眠ステージ</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    浅い睡眠/深い睡眠/REM睡眠の詳細
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Activity className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-300">秒単位の心拍数</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    運動中の詳細な心拍変化を記録
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-300">呼吸数・SpO2</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    睡眠中の呼吸数と血中酸素濃度
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function FitbitSettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    }>
      <FitbitSettingsContent />
    </Suspense>
  );
}
