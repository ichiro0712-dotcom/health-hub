'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Loader2, Smartphone } from "lucide-react";
import { Capacitor } from '@capacitor/core';
import { checkAndSyncHealthConnect } from "@/lib/mobile-sync";
import toast from "react-hot-toast";
import { useRouter } from 'next/navigation';

export default function MobileSyncButton() {
    const [loading, setLoading] = useState(false);
    const [isNative, setIsNative] = useState(false);
    const router = useRouter();

    useEffect(() => {
        setIsNative(Capacitor.isNativePlatform());
    }, []);

    if (!isNative) return null;

    async function handleSync() {
        setLoading(true);
        try {
            const success = await checkAndSyncHealthConnect();
            if (success) {
                router.refresh();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }

    return (
        <button
            onClick={handleSync}
            disabled={loading}
            className="px-4 py-2 bg-teal-50 border border-teal-200 text-teal-700 rounded-lg hover:bg-teal-100 transition flex items-center gap-2 text-sm font-medium shadow-sm disabled:opacity-70"
        >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
            <span className="hidden sm:inline">モバイル同期</span>
        </button>
    );
}
