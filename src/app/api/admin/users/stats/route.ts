import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/admin/users/stats
 * Return aggregate stats:
 * - total users
 * - active users (chatSession in last 7/30 days)
 * - fitbit connected count
 * - google docs connected count
 * - total chat sessions
 * - total health records
 * - average profile completion rate
 */
export async function GET(_request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeUsersLast7Days,
      activeUsersLast30Days,
      fitbitConnectedCount,
      googleDocsConnectedCount,
      totalChatSessions,
      totalHealthRecords,
      profileCompletionData,
    ] = await Promise.all([
      // Total users
      prisma.user.count(),

      // Active users in last 7 days (distinct users with chat sessions)
      prisma.healthChatSession
        .findMany({
          where: { createdAt: { gte: sevenDaysAgo } },
          select: { userId: true },
          distinct: ['userId'],
        })
        .then((results) => results.length),

      // Active users in last 30 days
      prisma.healthChatSession
        .findMany({
          where: { createdAt: { gte: thirtyDaysAgo } },
          select: { userId: true },
          distinct: ['userId'],
        })
        .then((results) => results.length),

      // Fitbit connected count
      prisma.fitbitAccount.count(),

      // Google Docs connected count
      prisma.googleDocsSettings.count(),

      // Total chat sessions
      prisma.healthChatSession.count(),

      // Total health records
      prisma.healthRecord.count(),

      // Profile completion: for each user, ratio of answered questions to total questions
      prisma.healthQuestionProgress
        .groupBy({
          by: ['userId'],
          _count: { id: true },
        })
        .then(async (userTotals) => {
          if (userTotals.length === 0) return 0;

          const answeredByUser = await prisma.healthQuestionProgress.groupBy({
            by: ['userId'],
            where: { isAnswered: true },
            _count: { id: true },
          });

          const answeredMap: Record<string, number> = {};
          for (const entry of answeredByUser) {
            answeredMap[entry.userId] = entry._count.id;
          }

          let totalRate = 0;
          for (const entry of userTotals) {
            const answered = answeredMap[entry.userId] || 0;
            const total = entry._count.id;
            totalRate += total > 0 ? answered / total : 0;
          }

          return totalRate / userTotals.length;
        }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        activeUsers: {
          last7Days: activeUsersLast7Days,
          last30Days: activeUsersLast30Days,
        },
        fitbitConnectedCount,
        googleDocsConnectedCount,
        totalChatSessions,
        totalHealthRecords,
        averageProfileCompletionRate: Math.round(profileCompletionData * 10000) / 100, // percentage with 2 decimals
      },
    });
  } catch (error) {
    console.error('GET /api/admin/users/stats error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '統計情報の取得に失敗しました' },
      { status: 500 }
    );
  }
}
