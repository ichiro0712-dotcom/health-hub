'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

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

interface DataCacheProviderProps {
    children: ReactNode;
}

export function DataCacheProvider({ children }: DataCacheProviderProps) {
    const [cache, setCache] = useState<Map<string, CacheEntry<unknown>>>(new Map());
    const [cacheVersion, setCacheVersion] = useState(0);

    const getCachedData = useCallback(<T,>(key: string): T | null => {
        const entry = cache.get(key);
        if (!entry) return null;
        return entry.data as T;
    }, [cache]);

    const setCachedData = useCallback(<T,>(key: string, data: T): void => {
        setCache(prev => {
            const newCache = new Map(prev);
            newCache.set(key, {
                data,
                timestamp: Date.now(),
            });
            return newCache;
        });
    }, []);

    const invalidateCache = useCallback((key: string): void => {
        setCache(prev => {
            const newCache = new Map(prev);
            newCache.delete(key);
            return newCache;
        });
        setCacheVersion(v => v + 1);
    }, []);

    const invalidateAllCaches = useCallback((): void => {
        setCache(new Map());
        setCacheVersion(v => v + 1);
    }, []);

    const isCacheValid = useCallback((key: string): boolean => {
        return cache.has(key);
    }, [cache]);

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
