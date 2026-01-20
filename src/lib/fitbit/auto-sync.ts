/**
 * Fitbit Auto-Sync Service
 *
 * Implements the standard pattern:
 * 1. Initial connection: Full historical sync (all available data)
 * 2. Subsequent access: Differential sync (last sync date → today)
 * 3. Trigger: On page access, if 24+ hours since last sync
 */

import prisma from '@/lib/prisma';
import { syncFitbitData } from './sync';
import { isFitbitConnected } from './client';

// Minimum hours between syncs
const SYNC_INTERVAL_HOURS = 24;

// Maximum days for full historical sync (Fitbit API supports ~150 days per type)
const FULL_SYNC_DAYS = 365;

export interface AutoSyncResult {
  synced: boolean;
  reason: 'not_connected' | 'recent_sync' | 'synced' | 'initial_sync' | 'error';
  message: string;
  lastSyncedAt?: Date;
  nextSyncAfter?: Date;
}

/**
 * Check if sync is needed and perform if necessary
 * This is the main entry point for auto-sync on page access
 */
export async function checkAndAutoSync(userId: string): Promise<AutoSyncResult> {
  try {
    // 1. Check if Fitbit is connected
    const isConnected = await isFitbitConnected(userId);
    if (!isConnected) {
      return {
        synced: false,
        reason: 'not_connected',
        message: 'Fitbit未接続',
      };
    }

    // 2. Get Fitbit account info
    const fitbitAccount = await prisma.fitbitAccount.findUnique({
      where: { userId },
      select: {
        lastSyncedAt: true,
        initialSyncCompleted: true,
      },
    });

    if (!fitbitAccount) {
      return {
        synced: false,
        reason: 'not_connected',
        message: 'Fitbitアカウント情報が見つかりません',
      };
    }

    const now = new Date();

    // 3. Check if initial sync is needed (first time connection)
    if (!fitbitAccount.initialSyncCompleted) {
      console.log('[AutoSync] Initial sync needed for user:', userId);
      return await performInitialSync(userId);
    }

    // 4. Check if enough time has passed since last sync
    if (fitbitAccount.lastSyncedAt) {
      const hoursSinceLastSync = (now.getTime() - fitbitAccount.lastSyncedAt.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastSync < SYNC_INTERVAL_HOURS) {
        const nextSyncAfter = new Date(fitbitAccount.lastSyncedAt.getTime() + SYNC_INTERVAL_HOURS * 60 * 60 * 1000);
        return {
          synced: false,
          reason: 'recent_sync',
          message: `最終同期: ${Math.round(hoursSinceLastSync)}時間前`,
          lastSyncedAt: fitbitAccount.lastSyncedAt,
          nextSyncAfter,
        };
      }
    }

    // 5. Perform differential sync
    console.log('[AutoSync] Differential sync for user:', userId);
    return await performDifferentialSync(userId, fitbitAccount.lastSyncedAt);

  } catch (error) {
    console.error('[AutoSync] Error:', error);
    return {
      synced: false,
      reason: 'error',
      message: error instanceof Error ? error.message : '同期エラー',
    };
  }
}

/**
 * Perform initial full historical sync
 * Called when user first connects Fitbit
 */
async function performInitialSync(userId: string): Promise<AutoSyncResult> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - FULL_SYNC_DAYS);

  console.log(`[AutoSync] Initial sync: ${startDate.toISOString()} to ${endDate.toISOString()}`);

  try {
    const result = await syncFitbitData(userId, {
      startDate,
      endDate,
    });

    if (result.success || result.errors.length < 7) {
      // Update sync status
      await prisma.fitbitAccount.update({
        where: { userId },
        data: {
          lastSyncedAt: new Date(),
          initialSyncCompleted: true,
        },
      });

      return {
        synced: true,
        reason: 'initial_sync',
        message: `過去${FULL_SYNC_DAYS}日分のデータを同期しました`,
        lastSyncedAt: new Date(),
      };
    } else {
      return {
        synced: false,
        reason: 'error',
        message: '初回同期に失敗しました',
      };
    }
  } catch (error) {
    console.error('[AutoSync] Initial sync failed:', error);
    return {
      synced: false,
      reason: 'error',
      message: error instanceof Error ? error.message : '初回同期エラー',
    };
  }
}

/**
 * Perform differential sync from last sync date to now
 * Called on subsequent page accesses
 */
async function performDifferentialSync(
  userId: string,
  lastSyncedAt: Date | null
): Promise<AutoSyncResult> {
  const endDate = new Date();

  // If no last sync date, sync last 7 days as fallback
  const startDate = lastSyncedAt
    ? new Date(lastSyncedAt)
    : new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Add 1 day buffer to ensure no gaps
  startDate.setDate(startDate.getDate() - 1);

  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  console.log(`[AutoSync] Differential sync: ${daysDiff} days`);

  try {
    const result = await syncFitbitData(userId, {
      startDate,
      endDate,
    });

    // Update last sync time even if some errors occurred
    await prisma.fitbitAccount.update({
      where: { userId },
      data: {
        lastSyncedAt: new Date(),
      },
    });

    if (result.success) {
      return {
        synced: true,
        reason: 'synced',
        message: `${daysDiff}日分のデータを同期しました`,
        lastSyncedAt: new Date(),
      };
    } else {
      return {
        synced: true,
        reason: 'synced',
        message: `同期完了（一部エラーあり: ${result.errors.length}件）`,
        lastSyncedAt: new Date(),
      };
    }
  } catch (error) {
    console.error('[AutoSync] Differential sync failed:', error);
    return {
      synced: false,
      reason: 'error',
      message: error instanceof Error ? error.message : '差分同期エラー',
    };
  }
}

/**
 * Force sync regardless of last sync time
 * Used for manual sync button
 */
export async function forceSyncFitbit(
  userId: string,
  days: number = 7
): Promise<AutoSyncResult> {
  const isConnected = await isFitbitConnected(userId);
  if (!isConnected) {
    return {
      synced: false,
      reason: 'not_connected',
      message: 'Fitbit未接続',
    };
  }

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  try {
    const result = await syncFitbitData(userId, {
      startDate,
      endDate,
    });

    await prisma.fitbitAccount.update({
      where: { userId },
      data: {
        lastSyncedAt: new Date(),
      },
    });

    return {
      synced: true,
      reason: 'synced',
      message: `${days}日分のデータを手動同期しました`,
      lastSyncedAt: new Date(),
    };
  } catch (error) {
    console.error('[AutoSync] Force sync failed:', error);
    return {
      synced: false,
      reason: 'error',
      message: error instanceof Error ? error.message : '手動同期エラー',
    };
  }
}

/**
 * Get sync status without performing sync
 */
export async function getSyncStatus(userId: string): Promise<{
  connected: boolean;
  lastSyncedAt: Date | null;
  initialSyncCompleted: boolean;
  needsSync: boolean;
}> {
  const fitbitAccount = await prisma.fitbitAccount.findUnique({
    where: { userId },
    select: {
      lastSyncedAt: true,
      initialSyncCompleted: true,
    },
  });

  if (!fitbitAccount) {
    return {
      connected: false,
      lastSyncedAt: null,
      initialSyncCompleted: false,
      needsSync: false,
    };
  }

  const now = new Date();
  const needsSync = !fitbitAccount.initialSyncCompleted ||
    !fitbitAccount.lastSyncedAt ||
    (now.getTime() - fitbitAccount.lastSyncedAt.getTime()) > SYNC_INTERVAL_HOURS * 60 * 60 * 1000;

  return {
    connected: true,
    lastSyncedAt: fitbitAccount.lastSyncedAt,
    initialSyncCompleted: fitbitAccount.initialSyncCompleted,
    needsSync,
  };
}
