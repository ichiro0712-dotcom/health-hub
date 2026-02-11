import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';

/**
 * PUT /api/admin/master-items/[code]
 * Update MasterItem (standardName, jlac10, synonyms)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { code } = await params;
    const body = await request.json();

    const existing = await prisma.masterItem.findUnique({ where: { code } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'マスター項目が見つかりません' },
        { status: 404 }
      );
    }

    const allowedFields = ['standardName', 'jlac10', 'synonyms'];
    const data: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        data[field] = body[field];
      }
    }

    const updated = await prisma.masterItem.update({
      where: { code },
      data,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('PUT /api/admin/master-items/[code] error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'マスター項目の更新に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/master-items/[code]
 * Delete MasterItem by code (only if no related inspectionItems)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { code } = await params;

    const existing = await prisma.masterItem.findUnique({
      where: { code },
      include: {
        _count: {
          select: { inspectionItems: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'マスター項目が見つかりません' },
        { status: 404 }
      );
    }

    if (existing._count.inspectionItems > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `このマスター項目には ${existing._count.inspectionItems} 件の検査項目が紐付いているため削除できません`,
        },
        { status: 409 }
      );
    }

    await prisma.masterItem.delete({ where: { code } });

    return NextResponse.json({ success: true, message: 'マスター項目を削除しました' });
  } catch (error) {
    console.error('DELETE /api/admin/master-items/[code] error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'マスター項目の削除に失敗しました' },
      { status: 500 }
    );
  }
}
