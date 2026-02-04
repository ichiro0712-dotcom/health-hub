'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // エラーをログに記録（本番ではエラートラッキングサービスに送信）
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">😵</div>
        <h2 className="text-xl font-bold text-white mb-2">
          エラーが発生しました
        </h2>
        <p className="text-slate-400 mb-6">
          申し訳ありません。予期せぬエラーが発生しました。
          <br />
          もう一度お試しください。
        </p>
        <button
          onClick={() => reset()}
          className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors"
        >
          もう一度試す
        </button>
      </div>
    </div>
  );
}
