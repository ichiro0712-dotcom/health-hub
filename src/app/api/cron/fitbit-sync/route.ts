/**
 * Cron Job: Auto-sync Fitbit data for inactive users
 *
 * Runs daily and syncs data for users who haven't accessed the app
 * in the last 10+ days but still have valid Fitbit connections.
 *
 * Vercel Cron: Add to vercel.json
 * {
 *   "crons": [{
 *     "path": "/api/cron/fitbit-sync",
 *     "schedule": "0 3 * * *"  // Every day at 3:00 AM
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { syncFitbitData } from '@/lib/fitbit/sync';

// Secret key to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET;

// Days of inactivity before cron takes over
const INACTIVITY_THRESHOLD_DAYS = 10;

// Max users to sync per cron run (to avoid timeout)
const MAX_USERS_PER_RUN = 20;

export async function GET(request: NextRequest) {
    // Verify cron secret (Vercel sends this automatically)
    // CRON_SECRET未設定時も拒否（セキュリティ強化）
    const authHeader = request.headers.get('authorization');
    if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const now = new Date();
        const inactivityThreshold = new Date(now.getTime() - INACTIVITY_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);

        // Find users with Fitbit connected but inactive for 10+ days
        const inactiveUsers = await prisma.fitbitAccount.findMany({
            where: {
                initialSyncCompleted: true,
                OR: [
                    { lastSyncedAt: null },
                    { lastSyncedAt: { lt: inactivityThreshold } },
                ],
            },
            select: {
                userId: true,
                lastSyncedAt: true,
            },
            take: MAX_USERS_PER_RUN,
            orderBy: {
                lastSyncedAt: 'asc', // Prioritize oldest syncs
            },
        });

        console.log(`[Cron] Found ${inactiveUsers.length} inactive users to sync`);

        // レスポンス用（userIdをマスク）
        const results: { userIndex: number; success: boolean; error?: string }[] = [];

        for (let i = 0; i < inactiveUsers.length; i++) {
            const account = inactiveUsers[i];
            try {
                const endDate = new Date();
                const startDate = account.lastSyncedAt
                    ? new Date(account.lastSyncedAt)
                    : new Date(endDate.getTime() - 14 * 24 * 60 * 60 * 1000); // Default to 14 days

                // Add 1 day buffer
                startDate.setDate(startDate.getDate() - 1);

                // ログにはユーザーIDを含めない（プライバシー保護）
                console.log(`[Cron] Syncing user #${i + 1}: ${startDate.toISOString()} to ${endDate.toISOString()}`);

                const syncResult = await syncFitbitData(account.userId, {
                    startDate,
                    endDate,
                });

                // Update last sync time
                await prisma.fitbitAccount.update({
                    where: { userId: account.userId },
                    data: { lastSyncedAt: new Date() },
                });

                results.push({
                    userIndex: i + 1,
                    success: syncResult.success,
                    error: syncResult.errors.length > 0
                        ? syncResult.errors.map(e => e.message).join(', ')
                        : undefined,
                });

                // Small delay between users to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 2000));

            } catch (error) {
                console.error(`[Cron] Failed to sync user #${i + 1}:`, error);
                results.push({
                    userIndex: i + 1,
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        console.log(`[Cron] Completed: ${successCount} success, ${failCount} failed`);

        return NextResponse.json({
            success: true,
            processed: results.length,
            successCount,
            failCount,
            results,
        });

    } catch (error) {
        console.error('[Cron] Error:', error);
        // 詳細エラーは内部ログのみ、クライアントには汎化メッセージ
        return NextResponse.json(
            { error: 'Cron job failed' },
            { status: 500 }
        );
    }
}
