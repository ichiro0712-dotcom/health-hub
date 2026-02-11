import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/admin/errors/stats
 * Return error stats:
 * - count by category in last 24h
 * - count by level
 * - count by hour (for chart)
 * - unresolved count
 */
export async function GET(_request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      countByCategoryLast24h,
      countByLevel,
      errorsLast24h,
      unresolvedCount,
    ] = await Promise.all([
      // Count by category in last 24h
      prisma.adminErrorLog.groupBy({
        by: ['category'],
        where: { createdAt: { gte: twentyFourHoursAgo } },
        _count: { id: true },
      }),

      // Count by level (all time)
      prisma.adminErrorLog.groupBy({
        by: ['level'],
        _count: { id: true },
      }),

      // All errors in last 24h for hourly chart
      prisma.adminErrorLog.findMany({
        where: { createdAt: { gte: twentyFourHoursAgo } },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),

      // Unresolved count
      prisma.adminErrorLog.count({ where: { resolved: false } }),
    ]);

    // Build category map
    const byCategory: Record<string, number> = {};
    for (const entry of countByCategoryLast24h) {
      byCategory[entry.category] = entry._count.id;
    }

    // Build level map
    const byLevel: Record<string, number> = {};
    for (const entry of countByLevel) {
      byLevel[entry.level] = entry._count.id;
    }

    // Build hourly chart data (last 24 hours)
    const byHour: { hour: string; count: number }[] = [];
    for (let i = 23; i >= 0; i--) {
      const hourStart = new Date(now.getTime() - i * 60 * 60 * 1000);
      hourStart.setMinutes(0, 0, 0);
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

      const count = errorsLast24h.filter(
        (e) => e.createdAt >= hourStart && e.createdAt < hourEnd
      ).length;

      byHour.push({
        hour: hourStart.toISOString(),
        count,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        byCategory,
        byLevel,
        byHour,
        unresolvedCount,
      },
    });
  } catch (error) {
    console.error('GET /api/admin/errors/stats error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'エラー統計の取得に失敗しました' },
      { status: 500 }
    );
  }
}
