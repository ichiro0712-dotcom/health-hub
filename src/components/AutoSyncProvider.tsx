'use client';

import { useEffect, useState } from 'react';
import { triggerAutoSync } from '@/app/actions/fitbit-sync';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';

interface AutoSyncProviderProps {
    children: React.ReactNode;
}

/**
 * Auto-sync provider that triggers Fitbit sync on page access
 * Should be placed in the app layout
 */
export default function AutoSyncProvider({ children }: AutoSyncProviderProps) {
    const [isSyncing, setIsSyncing] = useState(false);
    const [hasAttempted, setHasAttempted] = useState(false);

    useEffect(() => {
        // Only attempt sync once per session
        if (hasAttempted) return;

        const runAutoSync = async () => {
            setHasAttempted(true);
            setIsSyncing(true);

            try {
                const result = await triggerAutoSync();

                if (result.synced) {
                    // Show success toast for initial or differential sync
                    toast.success(result.message, {
                        icon: <RefreshCw className="w-4 h-4" />,
                        duration: 3000,
                    });
                }
                // Don't show anything for "recent_sync" or "not_connected"
            } catch (error) {
                console.error('Auto sync failed:', error);
                // Silent failure - don't bother user with sync errors
            } finally {
                setIsSyncing(false);
            }
        };

        // Small delay to ensure page is loaded
        const timer = setTimeout(runAutoSync, 1000);

        return () => clearTimeout(timer);
    }, [hasAttempted]);

    return (
        <>
            {children}
            {isSyncing && (
                <div className="fixed bottom-20 right-4 md:bottom-4 z-50 flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-2 rounded-full shadow-lg border border-gray-100 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 animate-in slide-in-from-right duration-300">
                    <RefreshCw className="w-4 h-4 animate-spin text-teal-500" />
                    <span>同期中...</span>
                </div>
            )}
        </>
    );
}
