import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/admin/prompts
 * List all AdminPrompt records, optional ?category= filter
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { searchParams } = request.nextUrl;
    const category = searchParams.get('category');
    const key = searchParams.get('key');

    const where: Record<string, unknown> = {};
    if (key) {
      where.key = key;
    } else if (category) {
      where.category = category;
    }

    const prompts = await prisma.adminPrompt.findMany({
      where,
      orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json({ success: true, data: prompts });
  } catch (error) {
    console.error('GET /api/admin/prompts error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'プロンプト一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/prompts
 * Create new AdminPrompt
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { key, category, label, description, value, valueType } = body;

    if (!key || !category || !label || value === undefined) {
      return NextResponse.json(
        { success: false, error: 'key, category, label, value は必須です' },
        { status: 400 }
      );
    }

    const existing = await prisma.adminPrompt.findUnique({ where: { key } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `key "${key}" は既に存在します` },
        { status: 409 }
      );
    }

    const prompt = await prisma.adminPrompt.create({
      data: {
        key,
        category,
        label,
        description: description || null,
        value,
        valueType: valueType || 'text',
        updatedBy: auth.session.user.email,
      },
    });

    return NextResponse.json({ success: true, data: prompt }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/prompts error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'プロンプトの作成に失敗しました' },
      { status: 500 }
    );
  }
}
