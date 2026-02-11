import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/admin/master-items
 * List all MasterItem records with count of related inspectionItems, optional ?search= filter
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
        { code: { contains: search, mode: 'insensitive' } },
        { standardName: { contains: search, mode: 'insensitive' } },
        { jlac10: { contains: search, mode: 'insensitive' } },
        { synonyms: { has: search } },
      ];
    }

    const items = await prisma.masterItem.findMany({
      where,
      include: {
        _count: {
          select: { inspectionItems: true },
        },
      },
      orderBy: { code: 'asc' },
    });

    return NextResponse.json({ success: true, data: items });
  } catch (error) {
    console.error('GET /api/admin/master-items error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'マスター項目一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/master-items
 * Create new MasterItem (code, standardName, jlac10, synonyms)
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { code, standardName, jlac10, synonyms } = body;

    if (!code || !standardName) {
      return NextResponse.json(
        { success: false, error: 'code, standardName は必須です' },
        { status: 400 }
      );
    }

    const existing = await prisma.masterItem.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: `code "${code}" は既に存在します` },
        { status: 409 }
      );
    }

    const item = await prisma.masterItem.create({
      data: {
        code,
        standardName,
        jlac10: jlac10 || null,
        synonyms: synonyms || [],
      },
    });

    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch (error) {
    console.error('POST /api/admin/master-items error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'マスター項目の作成に失敗しました' },
      { status: 500 }
    );
  }
}
