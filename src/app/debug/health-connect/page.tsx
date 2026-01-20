'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DebugHealthConnectPage() {
    const [loading, setLoading] = useState(false);
    const [lastResult, setLastResult] = useState<any>(null);

    const handleSync = async () => {
        setLoading(true);
        setLastResult(null);
        try {
            // Mock data simulating an Android Health Connect payload
            const mockData = {
                date: new Date().toISOString(), // Today
                data: {
                    steps: Math.floor(Math.random() * 5000) + 5000, // Random steps between 5000-10000
                    heartRate: Math.floor(Math.random() * 20) + 60,  // Random HR 60-80
                    weight: 65.0 + Math.random(),                    // Random weight
                }
            };

            const response = await fetch('/api/v1/health-connect/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(mockData),
            });

            const result = await response.json();
            setLastResult(result);

            if (response.ok && result.success) {
                toast.success('データ送信に成功しました');
            } else {
                toast.error('データ送信に失敗しました: ' + (result.error || 'Unknown error'));
            }

        } catch (error: any) {
            console.error(error);
            toast.error('エラーが発生しました');
            setLastResult({ error: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Health Connect Debug</h1>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <p className="mb-4 text-gray-600">
                    Androidアプリからのデータ送信をシミュレーションします。<br />
                    ボタンを押すと、ランダムな歩数・心拍数データをAPIに送信します。
                </p>

                <div className="flex flex-col gap-4">
                    <button
                        onClick={handleSync}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 transition"
                    >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        テストデータを送信 (POST /api/v1/health-connect/sync)
                    </button>
                </div>

                {lastResult && (
                    <div className="mt-6 p-4 bg-gray-50 rounded border border-gray-200 overflow-auto">
                        <h3 className="text-sm font-semibold mb-2">API Response:</h3>
                        <pre className="text-xs font-mono">{JSON.stringify(lastResult, null, 2)}</pre>
                    </div>
                )}
            </div>
        </div>
    );
}
