'use server';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { checkAndAutoSync, forceSyncFitbit, getSyncStatus } from "@/lib/fitbit/auto-sync";

export interface SyncStatusResponse {
    success: boolean;
    connected: boolean;
    lastSyncedAt: string | null;
    initialSyncCompleted: boolean;
    needsSync: boolean;
    error?: string;
}

export interface SyncResultResponse {
    success: boolean;
    synced: boolean;
    message: string;
    lastSyncedAt?: string;
    error?: string;
}

/**
 * Get current sync status
 */
export async function getFitbitSyncStatus(): Promise<SyncStatusResponse> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return {
            success: false,
            connected: false,
            lastSyncedAt: null,
            initialSyncCompleted: false,
            needsSync: false,
            error: "Unauthorized",
        };
    }

    try {
        const user = await prisma.user.findUnique({ where: { id: session.user.id } });
        if (!user) {
            return {
                success: false,
                connected: false,
                lastSyncedAt: null,
                initialSyncCompleted: false,
                needsSync: false,
                error: "User not found",
            };
        }

        const status = await getSyncStatus(user.id);

        return {
            success: true,
            connected: status.connected,
            lastSyncedAt: status.lastSyncedAt?.toISOString() || null,
            initialSyncCompleted: status.initialSyncCompleted,
            needsSync: status.needsSync,
        };
    } catch (error) {
        console.error("Get sync status error:", error);
        return {
            success: false,
            connected: false,
            lastSyncedAt: null,
            initialSyncCompleted: false,
            needsSync: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Trigger auto-sync on page access
 * This is called automatically when user visits the app
 */
export async function triggerAutoSync(): Promise<SyncResultResponse> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return {
            success: false,
            synced: false,
            message: "Unauthorized",
            error: "Unauthorized",
        };
    }

    try {
        const user = await prisma.user.findUnique({ where: { id: session.user.id } });
        if (!user) {
            return {
                success: false,
                synced: false,
                message: "User not found",
                error: "User not found",
            };
        }

        const result = await checkAndAutoSync(user.id);

        return {
            success: true,
            synced: result.synced,
            message: result.message,
            lastSyncedAt: result.lastSyncedAt?.toISOString(),
        };
    } catch (error) {
        console.error("Auto sync error:", error);
        return {
            success: false,
            synced: false,
            message: error instanceof Error ? error.message : "Sync failed",
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

/**
 * Manual force sync
 * Called when user clicks the sync button
 */
export async function manualFitbitSync(days: number = 7): Promise<SyncResultResponse> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return {
            success: false,
            synced: false,
            message: "Unauthorized",
            error: "Unauthorized",
        };
    }

    try {
        const user = await prisma.user.findUnique({ where: { id: session.user.id } });
        if (!user) {
            return {
                success: false,
                synced: false,
                message: "User not found",
                error: "User not found",
            };
        }

        const result = await forceSyncFitbit(user.id, days);

        return {
            success: true,
            synced: result.synced,
            message: result.message,
            lastSyncedAt: result.lastSyncedAt?.toISOString(),
        };
    } catch (error) {
        console.error("Manual sync error:", error);
        return {
            success: false,
            synced: false,
            message: error instanceof Error ? error.message : "Sync failed",
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}
