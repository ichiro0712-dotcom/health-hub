'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

interface DataCacheContextType {
    // Get cached data
    getCachedData: <T>(key: string) => T | null;
    // Set cached data
    setCachedData: <T>(key: string, data: T) => void;
    // Invalidate specific cache
    invalidateCache: (key: string) => void;
    // Invalidate all caches
    invalidateAllCaches: () => void;
    // Check if cache is valid
    isCacheValid: (key: string) => boolean;
    // Get cache version (for triggering re-fetches)
    cacheVersion: number;
}

const DataCacheContext = createContext<DataCacheContextType | null>(null);

// Cache keys
export const CACHE_KEYS = {
    TRENDS_DATA: 'trends_data',
    TRENDS_SETTINGS: 'trends_settings',
    HABITS_DATA: 'habits_data',
    RECORDS_DATA: 'records_data',
    ADVISOR_REPORT: 'advisor_report',
} as const;

const CACHE_PREFIX = 'health_hub_cache_';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes TTL

interface DataCacheProviderProps {
    children: ReactNode;
}

// Helper functions for sessionStorage
function getFromStorage<T>(key: string): CacheEntry<T> | null {
    if (typeof window === 'undefined') return null;
    try {
        const item = sessionStorage.getItem(CACHE_PREFIX + key);
        if (!item) return null;
        const entry = JSON.parse(item) as CacheEntry<T>;
        // Check TTL
        if (Date.now() - entry.timestamp > CACHE_TTL) {
            sessionStorage.removeItem(CACHE_PREFIX + key);
            return null;
        }
        return entry;
    } catch {
        return null;
    }
}

function setToStorage<T>(key: string, data: T): void {
    if (typeof window === 'undefined') return;
    try {
        const entry: CacheEntry<T> = {
            data,
            timestamp: Date.now(),
        };
        sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
    } catch {
        // Storage full or other error, silently fail
    }
}

function removeFromStorage(key: string): void {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(CACHE_PREFIX + key);
}

function clearAllStorage(): void {
    if (typeof window === 'undefined') return;
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key?.startsWith(CACHE_PREFIX)) {
            keysToRemove.push(key);
        }
    }
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
}

export function DataCacheProvider({ children }: DataCacheProviderProps) {
    const [cacheVersion, setCacheVersion] = useState(0);
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const getCachedData = useCallback(<T,>(key: string): T | null => {
        if (!isClient) return null;
        const entry = getFromStorage<T>(key);
        if (!entry) return null;
        return entry.data;
    }, [isClient]);

    const setCachedData = useCallback(<T,>(key: string, data: T): void => {
        if (!isClient) return;
        setToStorage(key, data);
    }, [isClient]);

    const invalidateCache = useCallback((key: string): void => {
        if (!isClient) return;
        removeFromStorage(key);
        setCacheVersion(v => v + 1);
    }, [isClient]);

    const invalidateAllCaches = useCallback((): void => {
        if (!isClient) return;
        clearAllStorage();
        setCacheVersion(v => v + 1);
    }, [isClient]);

    const isCacheValid = useCallback((key: string): boolean => {
        if (!isClient) return false;
        return getFromStorage(key) !== null;
    }, [isClient]);

    return (
        <DataCacheContext.Provider
            value={{
                getCachedData,
                setCachedData,
                invalidateCache,
                invalidateAllCaches,
                isCacheValid,
                cacheVersion,
            }}
        >
            {children}
        </DataCacheContext.Provider>
    );
}

export function useDataCache() {
    const context = useContext(DataCacheContext);
    if (!context) {
        throw new Error('useDataCache must be used within a DataCacheProvider');
    }
    return context;
}
