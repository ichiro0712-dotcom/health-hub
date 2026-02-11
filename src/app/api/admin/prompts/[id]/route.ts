import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/admin/prompts/[id]
 * Get single AdminPrompt by id
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { id } = await params;

    const prompt = await prisma.adminPrompt.findUnique({ where: { id } });
    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'プロンプトが見つかりません' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: prompt });
  } catch (error) {
    console.error('GET /api/admin/prompts/[id] error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'プロンプトの取得に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/prompts/[id]
 * Update AdminPrompt (partial fields: value, label, description, isActive)
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

    const existing = await prisma.adminPrompt.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'プロンプトが見つかりません' },
        { status: 404 }
      );
    }

    const allowedFields = ['value', 'label', 'description', 'isActive'];
    const data: Record<string, unknown> = { updatedBy: auth.session.user.email };

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        data[field] = body[field];
      }
    }

    const updated = await prisma.adminPrompt.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('PUT /api/admin/prompts/[id] error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'プロンプトの更新に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/prompts/[id]
 * Delete AdminPrompt by id
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { id } = await params;

    const existing = await prisma.adminPrompt.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'プロンプトが見つかりません' },
        { status: 404 }
      );
    }

    await prisma.adminPrompt.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'プロンプトを削除しました' });
  } catch (error) {
    console.error('DELETE /api/admin/prompts/[id] error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'プロンプトの削除に失敗しました' },
      { status: 500 }
    );
  }
}
