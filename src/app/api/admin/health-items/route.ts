import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/admin/health-items
 * List all AdminHealthItem records, optional ?search= filter (searches itemName, displayName, tags)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { searchParams } = request.nextUrl;
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { itemName: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ];
    }

    const items = await prisma.adminHealthItem.findMany({
      where,
      orderBy: [{ orderIndex: 'asc' }, { itemName: 'asc' }],
    });

    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    console.error('GET /api/admin/health-items error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'ヘルス項目一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}
