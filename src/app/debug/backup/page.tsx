'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  FileJson,
  Loader2,
  ArrowLeft,
} from 'lucide-react';

interface TableCounts {
  [key: string]: number;
}

interface BackupStatus {
  backupVersion: string;
  availableTables: string[];
  tableCounts: TableCounts;
  totalRecords: number;
  environment: string;
  timestamp: string;
}

interface ImportResult {
  success: boolean;
  imported: TableCounts;
  skipped: TableCounts;
  errors: Array<{ table: string; message: string }>;
  duration: number;
}

export default function BackupPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [importMode, setImportMode] = useState<'skip' | 'overwrite' | 'merge'>('skip');
  const [myDataOnly, setMyDataOnly] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [dryRun, setDryRun] = useState(true);

  // ステータス取得
  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/backup/status');
      const data = await res.json();
      if (data.success) {
        setBackupStatus(data.status);
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'ステータス取得に失敗しました' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchStatus();
    }
  }, [session, fetchStatus]);

  // 認証チェック
  if (status === 'loading') {
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

  // エクスポート実行
  const handleExport = async () => {
    setIsExporting(true);
    setMessage(null);

    try {
      const params = new URLSearchParams();
      if (myDataOnly) {
        params.set('myDataOnly', 'true');
      }

      const res = await fetch(`/api/admin/backup/export?${params.toString()}`, {
        method: 'POST',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'エクスポートに失敗しました');
      }

      // ファイルをダウンロード
      const blob = await res.blob();
      const fileName = res.headers.get('Content-Disposition')?.split('filename="')[1]?.replace('"', '') || 'backup.json';

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: 'バックアップが正常にダウンロードされました' });
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'エクスポートに失敗しました' });
    } finally {
      setIsExporting(false);
    }
  };

  // インポート実行
  const handleImport = async () => {
    if (!selectedFile) {
      setMessage({ type: 'error', text: 'ファイルを選択してください' });
      return;
    }

    setIsImporting(true);
    setMessage(null);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const params = new URLSearchParams();
      params.set('mode', importMode);
      if (dryRun) {
        params.set('dryRun', 'true');
      }

      const res = await fetch(`/api/admin/backup/import?${params.toString()}`, {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();

      if (res.ok) {
        setImportResult(result.result || result.preview);
        if (dryRun) {
          setMessage({ type: 'info', text: 'ドライラン完了。実際のインポートは行われていません。' });
        } else {
          setMessage({ type: 'success', text: 'インポートが完了しました' });
          fetchStatus(); // ステータスを再取得
        }
      } else {
        setMessage({ type: 'error', text: result.error || 'インポートに失敗しました' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'インポートに失敗しました' });
    } finally {
      setIsImporting(false);
    }
  };

  // ファイル選択
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.json')) {
        setMessage({ type: 'error', text: 'JSONファイルを選択してください' });
        return;
      }
      setSelectedFile(file);
      setMessage(null);
      setImportResult(null);
    }
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
                <Database className="w-6 h-6 text-teal-500" />
                データベース バックアップ
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">開発者向け機能</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* メッセージ */}
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
            ) : message.type === 'error' ? (
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <FileJson className="w-5 h-5 flex-shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* データベースステータス */}
        <section className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h2 className="font-semibold text-slate-700 dark:text-slate-200">データベース状態</h2>
            <button
              onClick={fetchStatus}
              disabled={isLoading}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {backupStatus ? (
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                  <p className="text-xs text-slate-500 dark:text-slate-400">合計レコード</p>
                  <p className="text-xl font-bold text-slate-800 dark:text-white">
                    {backupStatus.totalRecords.toLocaleString()}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                  <p className="text-xs text-slate-500 dark:text-slate-400">テーブル数</p>
                  <p className="text-xl font-bold text-slate-800 dark:text-white">
                    {backupStatus.availableTables.length}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                  <p className="text-xs text-slate-500 dark:text-slate-400">バージョン</p>
                  <p className="text-xl font-bold text-slate-800 dark:text-white">
                    {backupStatus.backupVersion}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                  <p className="text-xs text-slate-500 dark:text-slate-400">環境</p>
                  <p className="text-xl font-bold text-slate-800 dark:text-white">
                    {backupStatus.environment}
                  </p>
                </div>
              </div>

              {/* テーブル一覧 */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700">
                      <th className="text-left py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">
                        テーブル名
                      </th>
                      <th className="text-right py-2 px-3 text-slate-500 dark:text-slate-400 font-medium">
                        レコード数
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(backupStatus.tableCounts).map(([table, count]) => (
                      <tr
                        key={table}
                        className="border-b border-slate-50 dark:border-slate-700/50"
                      >
                        <td className="py-2 px-3 text-slate-700 dark:text-slate-300">{table}</td>
                        <td className="py-2 px-3 text-right text-slate-600 dark:text-slate-400">
                          {count.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              読み込み中...
            </div>
          )}
        </section>

        {/* エクスポート */}
        <section className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700">
            <h2 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <Download className="w-5 h-5 text-teal-500" />
              エクスポート
            </h2>
          </div>
          <div className="p-4 space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={myDataOnly}
                onChange={(e) => setMyDataOnly(e.target.checked)}
                className="w-4 h-4 text-teal-500 rounded focus:ring-teal-500"
              />
              <span className="text-slate-700 dark:text-slate-300">自分のデータのみ</span>
            </label>

            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  エクスポート中...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  バックアップをダウンロード
                </>
              )}
            </button>
          </div>
        </section>

        {/* インポート */}
        <section className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700">
            <h2 className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <Upload className="w-5 h-5 text-orange-500" />
              インポート
            </h2>
          </div>
          <div className="p-4 space-y-4">
            {/* ファイル選択 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                バックアップファイル
              </label>
              <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-500 dark:text-slate-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-medium
                  file:bg-teal-50 file:text-teal-700
                  dark:file:bg-teal-900/20 dark:file:text-teal-400
                  hover:file:bg-teal-100 dark:hover:file:bg-teal-900/30
                  cursor-pointer"
              />
              {selectedFile && (
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  選択: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            {/* インポートモード */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                インポートモード
              </label>
              <select
                value={importMode}
                onChange={(e) => setImportMode(e.target.value as 'skip' | 'overwrite' | 'merge')}
                className="w-full p-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300"
              >
                <option value="skip">スキップ (既存データを保持)</option>
                <option value="overwrite">上書き (既存データを置換)</option>
                <option value="merge">マージ (新しいデータのみ追加)</option>
              </select>
            </div>

            {/* ドライラン */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="w-4 h-4 text-teal-500 rounded focus:ring-teal-500"
              />
              <span className="text-slate-700 dark:text-slate-300">
                ドライラン (テスト実行、実際のインポートは行わない)
              </span>
            </label>

            {/* 警告 */}
            {!dryRun && (
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 rounded-lg text-sm flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span>
                  実際のインポートを行います。データが変更される可能性があります。
                  事前にバックアップを取得することをお勧めします。
                </span>
              </div>
            )}

            <button
              onClick={handleImport}
              disabled={isImporting || !selectedFile}
              className={`w-full py-3 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                dryRun
                  ? 'bg-slate-500 hover:bg-slate-600 text-white'
                  : 'bg-orange-500 hover:bg-orange-600 text-white'
              }`}
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  処理中...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  {dryRun ? 'ドライラン実行' : 'インポート実行'}
                </>
              )}
            </button>

            {/* インポート結果 */}
            {importResult && (
              <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg space-y-3">
                <h3 className="font-medium text-slate-700 dark:text-slate-300">
                  {dryRun ? 'ドライラン結果' : 'インポート結果'}
                </h3>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">インポート済み</p>
                    <ul className="mt-1 space-y-1">
                      {Object.entries(importResult.imported)
                        .filter(([, count]) => count > 0)
                        .map(([table, count]) => (
                          <li key={table} className="text-green-600 dark:text-green-400">
                            {table}: {count}件
                          </li>
                        ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400">スキップ</p>
                    <ul className="mt-1 space-y-1">
                      {Object.entries(importResult.skipped)
                        .filter(([, count]) => count > 0)
                        .map(([table, count]) => (
                          <li key={table} className="text-slate-600 dark:text-slate-400">
                            {table}: {count}件
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div>
                    <p className="text-red-500 font-medium">エラー</p>
                    <ul className="mt-1 space-y-1 text-sm text-red-600 dark:text-red-400">
                      {importResult.errors.map((err, i) => (
                        <li key={i}>
                          {err.table}: {err.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {importResult.duration && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    処理時間: {importResult.duration}ms
                  </p>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
