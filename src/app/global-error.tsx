'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="ja">
      <body className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">😵</div>
          <h2 className="text-xl font-bold text-white mb-2">
            重大なエラーが発生しました
          </h2>
          <p className="text-slate-400 mb-6">
            申し訳ありません。アプリケーションで問題が発生しました。
            <br />
            ページを再読み込みしてください。
          </p>
          <button
            onClick={() => reset()}
            className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors"
          >
            再読み込み
          </button>
        </div>
      </body>
    </html>
  );
}
