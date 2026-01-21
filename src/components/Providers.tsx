'use client';

import { SessionProvider } from "next-auth/react";
import { DataCacheProvider } from "@/contexts/DataCacheContext";

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <DataCacheProvider>
                {children}
            </DataCacheProvider>
        </SessionProvider>
    );
}
