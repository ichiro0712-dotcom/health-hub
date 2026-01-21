'use client';

import { useState } from 'react';
import { FileText, Save, RefreshCw, ExternalLink, Loader2, Check, ArrowLeft } from 'lucide-react';
import Header from '@/components/Header';
import Link from 'next/link';
import { toast } from 'sonner';
import {
    saveGoogleDocsSettings,
    triggerGoogleDocsSync,
    GoogleDocsSettingsData
} from '@/app/actions/google-docs-settings';

interface Props {
    initialSettings?: GoogleDocsSettingsData | null;
}

export default function GoogleDocsSettingsClient({ initialSettings }: Props) {
    const [recordsHeaderText, setRecordsHeaderText] = useState(initialSettings?.recordsHeaderText || '');
    const [profileHeaderText, setProfileHeaderText] = useState(initialSettings?.profileHeaderText || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const recordsDocUrl = `https://docs.google.com/document/d/${initialSettings?.recordsDocId || '1qCYtdo40Adk_-cG8vcwPkwlPW6NKHq97zeIX-EB0F3Y'}`;
    const profileDocUrl = `https://docs.google.com/document/d/${initialSettings?.profileDocId || '1sHZtZpcFE3Gv8IT8AZZftk3xnCCOUcVwfkC9NuzRanA'}`;

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const result = await saveGoogleDocsSettings({
                recordsHeaderText: recordsHeaderText || null,
                profileHeaderText: profileHeaderText || null,
            });

            if (result.success) {
                toast.success('設定を保存しました');
                setHasChanges(false);
            } else {
                toast.error(result.error || '保存に失敗しました');
            }
        } catch {
            toast.error('保存に失敗しました');
        } finally {
            setIsSaving(false);
        }
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            // まず設定を保存
            if (hasChanges) {
                await saveGoogleDocsSettings({
                    recordsHeaderText: recordsHeaderText || null,
                    profileHeaderText: profileHeaderText || null,
                });
                setHasChanges(false);
            }

            // 同期を実行
            const result = await triggerGoogleDocsSync();

            if (result.success) {
                toast.success('Google Docsに同期しました');
            } else {
                toast.error(result.error || '同期に失敗しました');
            }
        } catch {
            toast.error('同期に失敗しました');
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="min-h-screen pb-24 md:pb-8 bg-slate-50 dark:bg-slate-900">
            <Header />

            {/* ヘッダー */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <div className="max-w-2xl mx-auto px-4 md:px-6 py-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/settings"
                            className="p-2 -ml-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <FileText className="w-5 h-5 text-blue-500" />
                                Google Docs連携
                            </h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                データの自動同期設定
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* メインコンテンツ */}
            <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 space-y-6">
                {/* 記録データ設定 */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h2 className="font-bold text-slate-800 dark:text-white">
                                診断記録データ
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                健康診断の記録を同期
                            </p>
                        </div>
                        <a
                            href={recordsDocUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        >
                            <ExternalLink className="w-4 h-4" />
                            開く
                        </a>
                    </div>

                    <div className="space-y-3">
                        <label className="block">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                冒頭に挿入するテキスト
                            </span>
                            <textarea
                                value={recordsHeaderText}
                                onChange={(e) => {
                                    setRecordsHeaderText(e.target.value);
                                    setHasChanges(true);
                                }}
                                placeholder="例: このデータはHealth Hubアプリから自動同期されています。&#10;最新の健康診断結果を確認してください。"
                                className="mt-1.5 w-full min-h-[100px] p-3 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-y"
                            />
                        </label>
                    </div>
                </div>

                {/* 健康プロフィール設定 */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h2 className="font-bold text-slate-800 dark:text-white">
                                健康プロフィール
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                健康プロフィール情報を同期
                            </p>
                        </div>
                        <a
                            href={profileDocUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        >
                            <ExternalLink className="w-4 h-4" />
                            開く
                        </a>
                    </div>

                    <div className="space-y-3">
                        <label className="block">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                冒頭に挿入するテキスト
                            </span>
                            <textarea
                                value={profileHeaderText}
                                onChange={(e) => {
                                    setProfileHeaderText(e.target.value);
                                    setHasChanges(true);
                                }}
                                placeholder="例: 【重要】この健康プロフィールは医療相談時にご活用ください。"
                                className="mt-1.5 w-full min-h-[100px] p-3 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-y"
                            />
                        </label>
                    </div>
                </div>

                {/* 同期について */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-4">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                        <strong>自動同期について:</strong> 診断記録や健康プロフィールを保存すると、自動的にGoogle Docsに反映されます。
                    </p>
                </div>

                {/* アクションボタン */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !hasChanges}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : hasChanges ? (
                            <Save className="w-5 h-5" />
                        ) : (
                            <Check className="w-5 h-5" />
                        )}
                        {isSaving ? '保存中...' : hasChanges ? '設定を保存' : '保存済み'}
                    </button>

                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                    >
                        {isSyncing ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <RefreshCw className="w-5 h-5" />
                        )}
                        {isSyncing ? '同期中...' : '今すぐ同期'}
                    </button>
                </div>
            </div>
        </div>
    );
}
