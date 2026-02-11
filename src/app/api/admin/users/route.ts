import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/admin/users
 * List all users with summary stats.
 * Support ?search= for name/email, pagination with ?page=1&limit=20
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { searchParams } = request.nextUrl;
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          createdAt: true,
          updatedAt: true,
          fitbitAccount: {
            select: { id: true },
          },
          googleDocsSettings: {
            select: { id: true },
          },
          _count: {
            select: {
              healthChatSessions: true,
              healthRecords: true,
              habits: true,
              supplements: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    const data = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      fitbitConnected: !!user.fitbitAccount,
      googleDocsConnected: !!user.googleDocsSettings,
      chatSessionCount: user._count.healthChatSessions,
      healthRecordCount: user._count.healthRecords,
      habitCount: user._count.habits,
      supplementCount: user._count.supplements,
    }));

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/admin/users error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'ユーザー一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}
