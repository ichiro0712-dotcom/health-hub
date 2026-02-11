import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/admin/health-questions
 * List all AdminHealthQuestion records, optional ?sectionId= and ?priority= filters
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { searchParams } = request.nextUrl;
    const sectionId = searchParams.get('sectionId');
    const priority = searchParams.get('priority');

    const where: Record<string, unknown> = {};
    if (sectionId) {
      where.sectionId = sectionId;
    }
    if (priority) {
      const parsed = parseInt(priority, 10);
      if (!isNaN(parsed)) {
        where.priority = parsed;
      }
    }

    const questions = await prisma.adminHealthQuestion.findMany({
      where,
      orderBy: [{ sectionId: 'asc' }, { priority: 'asc' }, { orderIndex: 'asc' }],
    });

    return NextResponse.json({ success: true, data: questions });
  } catch (error) {
    console.error('GET /api/admin/health-questions error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '質問一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/health-questions
 * Create new AdminHealthQuestion
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { questionId, sectionId, priority, question, intent, extractionHints, orderIndex } = body;

    if (!questionId || !sectionId || priority === undefined || !question || !intent) {
      return NextResponse.json(
        { success: false, error: 'questionId, sectionId, priority, question, intent は必須です' },
        { status: 400 }
      );
    }

    const existing = await prisma.adminHealthQuestion.findUnique({ where: { questionId } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `questionId "${questionId}" は既に存在します` },
        { status: 409 }
      );
    }

    const created = await prisma.adminHealthQuestion.create({
      data: {
        questionId,
        sectionId,
        priority,
        question,
        intent,
        extractionHints: extractionHints || [],
        orderIndex: orderIndex ?? 0,
        updatedBy: auth.session.user.email,
      },
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/health-questions error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '質問の作成に失敗しました' },
      { status: 500 }
    );
  }
}
