import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/admin/users/[id]
 * Get detailed user info including:
 * - basic info
 * - fitbitAccount status
 * - googleDocsSettings
 * - healthChatSession count by mode
 * - healthRecord count
 * - habit count with total records
 * - supplement count
 * - healthQuestionProgress stats (answered/total)
 * - inspectionItem count
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        birthDate: true,
        createdAt: true,
        updatedAt: true,
        fitbitAccount: {
          select: {
            id: true,
            fitbitUserId: true,
            lastSyncedAt: true,
            initialSyncCompleted: true,
            createdAt: true,
          },
        },
        googleDocsSettings: {
          select: {
            id: true,
            recordsDocId: true,
            profileDocId: true,
            autoSyncEnabled: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // Aggregate counts in parallel
    const [
      chatSessionsByMode,
      healthRecordCount,
      habitsWithRecordCount,
      supplementCount,
      questionProgress,
      inspectionItemCount,
    ] = await Promise.all([
      // Chat sessions grouped by mode
      prisma.healthChatSession.groupBy({
        by: ['mode'],
        where: { userId: id },
        _count: { id: true },
      }),
      // Health record count
      prisma.healthRecord.count({ where: { userId: id } }),
      // Habits with total record counts
      prisma.habit.findMany({
        where: { userId: id },
        select: {
          id: true,
          name: true,
          _count: { select: { records: true } },
        },
      }),
      // Supplement count
      prisma.supplement.count({ where: { userId: id } }),
      // Question progress stats
      prisma.healthQuestionProgress.aggregate({
        where: { userId: id },
        _count: { id: true },
      }).then(async (total) => {
        const answered = await prisma.healthQuestionProgress.count({
          where: { userId: id, isAnswered: true },
        });
        return { total: total._count.id, answered };
      }),
      // Inspection item count
      prisma.inspectionItem.count({ where: { userId: id } }),
    ]);

    const chatSessionModeMap: Record<string, number> = {};
    for (const group of chatSessionsByMode) {
      chatSessionModeMap[group.mode || 'null'] = group._count.id;
    }

    const totalHabitRecords = habitsWithRecordCount.reduce(
      (sum, h) => sum + h._count.records,
      0
    );

    const data = {
      ...user,
      fitbitConnected: !!user.fitbitAccount,
      googleDocsConnected: !!user.googleDocsSettings,
      stats: {
        chatSessions: {
          byMode: chatSessionModeMap,
          total: Object.values(chatSessionModeMap).reduce((a, b) => a + b, 0),
        },
        healthRecordCount,
        habits: {
          count: habitsWithRecordCount.length,
          totalRecords: totalHabitRecords,
        },
        supplementCount,
        questionProgress: {
          answered: questionProgress.answered,
          total: questionProgress.total,
        },
        inspectionItemCount,
      },
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('GET /api/admin/users/[id] error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'ユーザー詳細の取得に失敗しました' },
      { status: 500 }
    );
  }
}
