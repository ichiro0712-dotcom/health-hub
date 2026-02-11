import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';

/**
 * PUT /api/admin/health-items/[id]
 * Update AdminHealthItem fields (displayName, minVal, maxVal, safeMin, safeMax, tags, description, isActive)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.adminHealthItem.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'ヘルス項目が見つかりません' },
        { status: 404 }
      );
    }

    const allowedFields = [
      'displayName',
      'minVal',
      'maxVal',
      'safeMin',
      'safeMax',
      'tags',
      'description',
      'isActive',
    ];
    const data: Record<string, unknown> = { updatedBy: auth.session.user.email };

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        data[field] = body[field];
      }
    }

    const updated = await prisma.adminHealthItem.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('PUT /api/admin/health-items/[id] error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'ヘルス項目の更新に失敗しました' },
      { status: 500 }
    );
  }
}
