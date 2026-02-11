import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/admin/errors
 * List AdminErrorLog records with filters:
 * ?level=, ?category=, ?resolved=, ?from=, ?to=, pagination (?page=, ?limit=)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { searchParams } = request.nextUrl;
    const level = searchParams.get('level');
    const category = searchParams.get('category');
    const resolved = searchParams.get('resolved');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (level) {
      where.level = level;
    }
    if (category) {
      where.category = category;
    }
    if (resolved !== null && resolved !== undefined && resolved !== '') {
      where.resolved = resolved === 'true';
    }
    if (from || to) {
      const createdAt: Record<string, Date> = {};
      if (from) {
        createdAt.gte = new Date(from);
      }
      if (to) {
        createdAt.lte = new Date(to);
      }
      where.createdAt = createdAt;
    }

    const [errors, total] = await Promise.all([
      prisma.adminErrorLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.adminErrorLog.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: errors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/admin/errors error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'エラーログ一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/errors
 * Create new error log (for internal use by other APIs)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { level, category, message, metadata, userId, endpoint } = body;

    if (!level || !category || !message) {
      return NextResponse.json(
        { success: false, error: 'level, category, message は必須です' },
        { status: 400 }
      );
    }

    const errorLog = await prisma.adminErrorLog.create({
      data: {
        level,
        category,
        message,
        metadata: metadata || null,
        userId: userId || null,
        endpoint: endpoint || null,
      },
    });

    return NextResponse.json({ success: true, data: errorLog }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/errors error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'エラーログの作成に失敗しました' },
      { status: 500 }
    );
  }
}
