'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { checkAndSyncHealthConnect } from "@/lib/mobile-sync";
import Link from 'next/link';
import { useDataCache, CACHE_KEYS } from '@/contexts/DataCacheContext';
import {
    Smartphone,
    Watch,
    Link2,
    Unlink,
    RefreshCw,
    CheckCircle,
    AlertTriangle,
    Clock,
    Heart,
    Moon,
    Loader2,
    Shield,
    Zap,
    Footprints,
    Activity,
    BarChart2,
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

function SmartphoneClientContent() {
    const { data: session, status: authStatus } = useSession();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { invalidateCache } = useDataCache();

    // Platform detection
    const [isNative, setIsNative] = useState(false);

    // Health Connect state
    const [isHealthConnectSyncing, setIsHealthConnectSyncing] = useState(false);

    // Fitbit state
    const [fitbitStatus, setFitbitStatus] = useState<FitbitStatus | null>(null);
    const [isLoadingFitbit, setIsLoadingFitbit] = useState(true);
    const [isConnectingFitbit, setIsConnectingFitbit] = useState(false);
    const [isDisconnectingFitbit, setIsDisconnectingFitbit] = useState(false);
    const [isSyncingFitbit, setIsSyncingFitbit] = useState(false);
    const [fitbitSyncResult, setFitbitSyncResult] = useState<SyncResult | null>(null);

    // Messages
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

    // Check platform
    useEffect(() => {
        setIsNative(Capacitor.isNativePlatform());
    }, []);

    // Check URL params from Fitbit callback
    useEffect(() => {
        const success = searchParams.get('success');
        const error = searchParams.get('error');

        if (success === 'connected') {
            setMessage({ type: 'success', text: 'Fitbitと連携しました！' });
            window.history.replaceState({}, '', '/smartphone');
        } else if (error) {
            setMessage({ type: 'error', text: decodeURIComponent(error) });
            window.history.replaceState({}, '', '/smartphone');
        }
    }, [searchParams]);

    // Fetch Fitbit status
    const fetchFitbitStatus = useCallback(async () => {
        try {
            const res = await fetch('/api/fitbit/status');
            const data = await res.json();
            if (data.success) {
                setFitbitStatus(data);
            }
        } catch (error) {
            console.error('Fitbit status fetch error:', error);
        } finally {
            setIsLoadingFitbit(false);
        }
    }, []);

    useEffect(() => {
        if (session) {
            fetchFitbitStatus();
        }
    }, [session, fetchFitbitStatus]);

    // Redirect to home if not logged in
    useEffect(() => {
        if (authStatus === 'unauthenticated') {
            router.push('/');
        }
    }, [authStatus, router]);

    // Auth check - show loading while checking auth
    if (authStatus === 'loading' || authStatus === 'unauthenticated') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
            </div>
        );
    }

    // Health Connect sync
    const handleHealthConnectSync = async () => {
        setIsHealthConnectSyncing(true);
        setMessage(null);
        try {
            const success = await checkAndSyncHealthConnect();
            if (success) {
                // Invalidate trends cache since smartphone data was synced
                invalidateCache(CACHE_KEYS.TRENDS_DATA);
                setMessage({ type: 'success', text: 'Health Connectと同期しました' });
                router.refresh();
            }
        } catch (e) {
            console.error(e);
            setMessage({ type: 'error', text: 'Health Connect同期に失敗しました' });
        } finally {
            setIsHealthConnectSyncing(false);
        }
    };

    // Fitbit connect
    const handleFitbitConnect = () => {
        setIsConnectingFitbit(true);
        window.location.href = '/api/fitbit/auth';
    };

    // Fitbit disconnect
    const handleFitbitDisconnect = async () => {
        if (!confirm('Fitbit連携を解除しますか？\n保存済みのデータは削除されません。')) {
            return;
        }

        setIsDisconnectingFitbit(true);
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
            setIsDisconnectingFitbit(false);
        }
    };

    // Fitbit sync
    const handleFitbitSync = async () => {
        setIsSyncingFitbit(true);
        setMessage(null);
        setFitbitSyncResult(null);

        try {
            const res = await fetch('/api/fitbit/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                    endDate: new Date().toISOString(),
                }),
            });

            const data = await res.json();
            setFitbitSyncResult(data);

            if (data.success) {
                // Invalidate trends cache since Fitbit data was synced
                invalidateCache(CACHE_KEYS.TRENDS_DATA);
                setMessage({ type: 'success', text: 'Fitbitデータを同期しました' });
                fetchFitbitStatus();
            } else {
                setMessage({ type: 'error', text: data.error || 'Fitbit同期に失敗しました' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Fitbit同期に失敗しました' });
        } finally {
            setIsSyncingFitbit(false);
        }
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('ja-JP');
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {/* ヘッダー */}
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                    <Smartphone className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                        スマホデータ連携
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                        デバイスやサービスからヘルスデータを同期
                    </p>
                </div>
            </div>

            {/* Message */}
            {message && (
                <div
                    className={`mb-6 p-4 rounded-xl flex items-start gap-3 ${message.type === 'success'
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                            : message.type === 'error'
                                ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                                : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
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

            {/* データ確認リンク */}
            <div className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-900/20 dark:to-emerald-900/20 rounded-2xl border border-teal-100 dark:border-teal-800 p-4 mb-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <BarChart2 className="w-5 h-5 text-teal-500" />
                        <div>
                            <p className="font-medium text-slate-800 dark:text-slate-100">同期したデータを確認</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">歩数・心拍数・睡眠などのグラフを表示</p>
                        </div>
                    </div>
                    <Link
                        href="/trends"
                        className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium text-sm transition flex items-center gap-2"
                    >
                        推移を見る
                    </Link>
                </div>
            </div>

            {/* Health Connect Section */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mb-6">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                        <Smartphone className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                        <h2 className="font-semibold text-slate-800 dark:text-white">Health Connect</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {isNative ? 'Androidの健康データを同期' : 'Androidアプリで同期可能'}
                        </p>
                    </div>
                    <button
                        onClick={handleHealthConnectSync}
                        disabled={isHealthConnectSyncing || !isNative}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium text-sm transition disabled:opacity-50 flex items-center gap-2"
                    >
                        {isHealthConnectSyncing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <RefreshCw className="w-4 h-4" />
                        )}
                        同期
                    </button>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-700/30">
                    <div className="flex flex-wrap gap-2 text-xs">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300">
                            <Footprints className="w-3 h-3" /> 歩数
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300">
                            <Heart className="w-3 h-3" /> 心拍数
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300">
                            <Moon className="w-3 h-3" /> 睡眠
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300">
                            <Activity className="w-3 h-3" /> 体重
                        </span>
                    </div>
                    {!isNative && (
                        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                            ※ Health Connect同期はAndroidアプリからのみ利用できます
                        </p>
                    )}
                </div>
            </div>

            {/* Fitbit Section */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mb-6">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/30 rounded-full flex items-center justify-center">
                        <Watch className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div className="flex-1">
                        <h2 className="font-semibold text-slate-800 dark:text-white">Fitbit</h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {fitbitStatus?.connected
                                ? `連携中 (${fitbitStatus.fitbitUserId})`
                                : 'Fitbitデバイスと連携'}
                        </p>
                    </div>
                    {isLoadingFitbit ? (
                        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                    ) : fitbitStatus?.connected ? (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleFitbitSync}
                                disabled={isSyncingFitbit}
                                className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium text-sm transition disabled:opacity-50 flex items-center gap-2"
                            >
                                {isSyncingFitbit ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="w-4 h-4" />
                                )}
                                同期
                            </button>
                            <button
                                onClick={handleFitbitDisconnect}
                                disabled={isDisconnectingFitbit}
                                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                                title="連携解除"
                            >
                                {isDisconnectingFitbit ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Unlink className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleFitbitConnect}
                            disabled={isConnectingFitbit}
                            className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium text-sm transition disabled:opacity-50 flex items-center gap-2"
                        >
                            {isConnectingFitbit ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Link2 className="w-4 h-4" />
                            )}
                            連携する
                        </button>
                    )}
                </div>

                {/* Fitbit Connected Info */}
                {fitbitStatus?.connected && (
                    <div className="p-4 space-y-4">
                        {/* Status */}
                        <div className="grid grid-cols-2 gap-3">
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
                                    状態
                                </p>
                                <p className={`text-sm font-medium ${fitbitStatus.isExpired
                                        ? 'text-red-600 dark:text-red-400'
                                        : 'text-green-600 dark:text-green-400'
                                    }`}>
                                    {fitbitStatus.isExpired ? '要再認証' : '正常'}
                                </p>
                            </div>
                        </div>

                        {/* Sync Result */}
                        {fitbitSyncResult && (
                            <div className={`p-3 rounded-lg text-sm ${fitbitSyncResult.success
                                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                                    : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                                }`}>
                                <p className="font-medium">
                                    同期完了: {new Date(fitbitSyncResult.syncedAt).toLocaleString('ja-JP')}
                                </p>
                                {fitbitSyncResult.errors.length > 0 && (
                                    <ul className="mt-1 text-xs">
                                        {fitbitSyncResult.errors.map((err, i) => (
                                            <li key={i}>• {err.type}: {err.message}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Fitbit Not Connected Info */}
                {!fitbitStatus?.connected && !isLoadingFitbit && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-700/30">
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                            Fitbitと連携すると以下のデータを取得できます:
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs">
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300">
                                <Heart className="w-3 h-3 text-red-500" /> HRV (心拍変動)
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300">
                                <Moon className="w-3 h-3 text-purple-500" /> 睡眠ステージ詳細
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300">
                                <Activity className="w-3 h-3 text-orange-500" /> 秒単位心拍数
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300">
                                <Zap className="w-3 h-3 text-blue-500" /> SpO2・呼吸数
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Data Priority Info */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                    <h2 className="font-semibold text-slate-700 dark:text-slate-200">データ優先順位</h2>
                </div>
                <div className="p-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                        複数のソースからデータがある場合、以下の優先順位で表示されます:
                    </p>
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700/30 rounded">
                            <span className="text-slate-700 dark:text-slate-300">心拍数・HRV・睡眠ステージ</span>
                            <span className="text-teal-600 dark:text-teal-400 font-medium">Fitbit優先</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700/30 rounded">
                            <span className="text-slate-700 dark:text-slate-300">体重・血圧</span>
                            <span className="text-green-600 dark:text-green-400 font-medium">Health Connect優先</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700/30 rounded">
                            <span className="text-slate-700 dark:text-slate-300">歩数・運動</span>
                            <span className="text-slate-500 dark:text-slate-400 font-medium">最新データを使用</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 注意書き */}
            <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-6">
                ※ 同期したデータは「推移」画面で確認できます
            </p>
        </div>
    );
}

export default function SmartphoneClient() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
            </div>
        }>
            <SmartphoneClientContent />
        </Suspense>
    );
}
