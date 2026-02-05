import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from '@/lib/prisma';
import { getExternalDataPreview } from '@/lib/external-data-importer';

// GET: 取り込み可能な外部データのプレビューを取得
export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: token.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 最新のセッションから lastImportedAt を取得
    const latestSession = await prisma.healthChatSession.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
    });

    // 外部データのプレビューを取得
    const preview = await getExternalDataPreview(
      user.id,
      // lastExternalDataCheck カラムが存在しない場合は null を使用
      null
    );

    return NextResponse.json({
      success: true,
      ...preview,
      lastChecked: new Date().toISOString(),
    });
  } catch (error) {
    console.error('External data preview error:', error);
    return NextResponse.json(
      { error: '外部データの取得に失敗しました' },
      { status: 500 }
    );
  }
}
