import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';

/**
 * PUT /api/admin/errors/[id]
 * Mark as resolved (resolved=true, resolvedAt, resolvedBy)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { id } = await params;

    const existing = await prisma.adminErrorLog.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'エラーログが見つかりません' },
        { status: 404 }
      );
    }

    if (existing.resolved) {
      return NextResponse.json(
        { success: false, error: 'このエラーログは既に解決済みです' },
        { status: 400 }
      );
    }

    const updated = await prisma.adminErrorLog.update({
      where: { id },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy: auth.session.user.email,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('PUT /api/admin/errors/[id] error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'エラーログの更新に失敗しました' },
      { status: 500 }
    );
  }
}
