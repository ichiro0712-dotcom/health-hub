import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';

/**
 * PUT /api/admin/health-questions/[id]
 * Update AdminHealthQuestion fields
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

    const existing = await prisma.adminHealthQuestion.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: '質問が見つかりません' },
        { status: 404 }
      );
    }

    const allowedFields = [
      'sectionId',
      'priority',
      'question',
      'intent',
      'extractionHints',
      'isActive',
      'orderIndex',
    ];
    const data: Record<string, unknown> = { updatedBy: auth.session.user.email };

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        data[field] = body[field];
      }
    }

    const updated = await prisma.adminHealthQuestion.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('PUT /api/admin/health-questions/[id] error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '質問の更新に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/health-questions/[id]
 * Soft delete: set isActive=false
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { id } = await params;

    const existing = await prisma.adminHealthQuestion.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: '質問が見つかりません' },
        { status: 404 }
      );
    }

    const updated = await prisma.adminHealthQuestion.update({
      where: { id },
      data: {
        isActive: false,
        updatedBy: auth.session.user.email,
      },
    });

    return NextResponse.json({ success: true, data: updated, message: '質問を無効化しました' });
  } catch (error) {
    console.error('DELETE /api/admin/health-questions/[id] error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '質問の削除に失敗しました' },
      { status: 500 }
    );
  }
}
