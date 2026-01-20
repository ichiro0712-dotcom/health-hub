'use client';

import { useState } from 'react';
import { addSupplement, getSupplements } from '@/app/actions/supplements';
import { toast } from 'sonner';

export default function ClientDebugControls() {
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    const handleAddTestSupplement = async () => {
        setLoading(true);
        try {
            const data = {
                name: 'Debug Supplement ' + new Date().toLocaleTimeString(),
                timing: ['朝', '夕'],
                amount: '1',
                unit: 'test-unit',
                manufacturer: 'Debug Data Corp',
                note: 'Created via Debug Page',
                startDate: new Date(),
                pausedPeriods: []
            };

            const res = await addSupplement(data);
            console.log('[DebugPage] addSupplement result:', res);
            setResult(res);

            if (res.success) {
                toast.success('Added debug supplement');
                // Refresh list not needed as server component will re-render on refresh, 
                // but we can fetch manually to verify client-side visibility
                const listRes = await getSupplements();
                console.log('[DebugPage] getSupplements result:', listRes);
            } else {
                toast.error('Failed to add: ' + res.error);
            }
        } catch (e: any) {
            console.error('[DebugPage] Error:', e);
            setResult({ error: e.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 bg-white rounded shadow mb-4">
            <h2 className="font-bold mb-2">Client Actions</h2>
            <div className="flex gap-2 mb-4">
                <button
                    onClick={handleAddTestSupplement}
                    disabled={loading}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading ? 'Adding...' : 'Add Test Supplement'}
                </button>
            </div>

            {result && (
                <div className="mt-2 text-xs">
                    <p className="font-bold">Last Action Result:</p>
                    <pre className="p-2 bg-slate-100 rounded overflow-auto max-h-40">
                        {JSON.stringify(result, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}
