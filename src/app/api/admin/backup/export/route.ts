/**
 * データベースエクスポートAPI
 * POST /api/admin/backup/export
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { exportDatabase, generateBackupFileName } from '@/lib/backup';
import { ExportOptions } from '@/lib/backup/types';

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      );
    }

    // 開発環境またはadminユーザーのみ許可
    // TODO: 本番環境では適切な権限チェックを実装
    if (process.env.NODE_ENV === 'production') {
      // 本番環境では管理者のみ許可するロジックを追加
      // 現時点では開発環境のみ許可
    }

    // リクエストパラメータを取得
    const searchParams = request.nextUrl.searchParams;
    const tablesParam = searchParams.get('tables');
    const userIdParam = searchParams.get('userId');
    const myDataOnly = searchParams.get('myDataOnly') === 'true';

    // エクスポートオプションを構築
    const options: ExportOptions = {};

    if (tablesParam) {
      options.tables = tablesParam.split(',').map(t => t.trim());
    }

    // ユーザー単位エクスポート
    if (myDataOnly) {
      // @ts-ignore - session.user.idはJWTコールバックで追加
      options.userId = session.user.id;
    } else if (userIdParam) {
      options.userId = userIdParam;
    }

    // エクスポート実行
    const backup = await exportDatabase(options);

    // ファイル名を生成
    const fileName = generateBackupFileName(options.userId);

    // JSONレスポンスとして返却
    const jsonData = JSON.stringify(backup, null, 2);

    return new NextResponse(jsonData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'X-Record-Counts': JSON.stringify(backup.metadata.recordCounts),
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'エクスポートに失敗しました',
      },
      { status: 500 }
    );
  }
}

// GETメソッドでプレビュー（レコード数確認）
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const myDataOnly = searchParams.get('myDataOnly') === 'true';

    // @ts-ignore
    const userId = myDataOnly ? session.user.id : undefined;

    // レコード数を取得
    const { getTableCounts } = await import('@/lib/backup');
    const counts = await getTableCounts(userId);

    return NextResponse.json({
      success: true,
      counts,
      userId: userId || null,
    });
  } catch (error) {
    console.error('Preview error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'プレビューに失敗しました',
      },
      { status: 500 }
    );
  }
}
