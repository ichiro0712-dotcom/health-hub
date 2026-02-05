import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from '@/lib/prisma';
import { importExternalData } from '@/lib/external-data-importer';
import type { ExternalDataSource } from '@/constants/external-data-mapping';

// POST: 外部データを健康プロフィールに取り込む
export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { sources, sessionId } = body as {
      sources?: ExternalDataSource[];
      sessionId?: string;
    };

    // ソースが指定されていない場合は全ソースを対象
    const targetSources: ExternalDataSource[] = sources && sources.length > 0
      ? sources
      : ['healthRecord', 'fitData', 'detailedSleep', 'hrvData', 'supplement'];

    // データ取り込みを実行
    const result = await importExternalData(user.id, targetSources, sessionId);

    // セッションIDが指定されている場合、チャットメッセージとして取り込み結果を記録
    if (sessionId && result.questionsAnswered.length > 0) {
      // 取り込み結果をAIメッセージとして追加
      const importedItems = result.questionsAnswered
        .map(q => `・${q.value}`)
        .join('\n');

      const message = `外部データから以下の情報を取り込みました：\n\n${importedItems}\n\n${result.summary}`;

      await prisma.healthChatMessage.create({
        data: {
          sessionId,
          role: 'assistant',
          content: message,
        },
      });
    }

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('External data import error:', error);
    return NextResponse.json(
      { error: '外部データの取り込みに失敗しました' },
      { status: 500 }
    );
  }
}
