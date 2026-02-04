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

    // 管理者のみ許可（環境変数で管理者メールを設定）
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
    const userEmail = session.user.email?.toLowerCase();

    // myDataOnlyの場合は一般ユーザーも許可、それ以外は管理者のみ
    const searchParams = request.nextUrl.searchParams;
    const myDataOnly = searchParams.get('myDataOnly') === 'true';
    const isAdmin = userEmail && adminEmails.includes(userEmail);

    if (!myDataOnly && !isAdmin) {
      return NextResponse.json(
        { success: false, error: '管理者権限が必要です' },
        { status: 403 }
      );
    }

    // リクエストパラメータを取得
    const tablesParam = searchParams.get('tables');

    // エクスポートオプションを構築
    const options: ExportOptions = {};

    if (tablesParam) {
      options.tables = tablesParam.split(',').map(t => t.trim());
    }

    // ユーザー単位エクスポート（一般ユーザーは自分のデータのみ）
    options.userId = session.user.id;

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

    // 管理者のみ許可
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
    const userEmail = session.user.email?.toLowerCase();
    const searchParams = request.nextUrl.searchParams;
    const myDataOnly = searchParams.get('myDataOnly') === 'true';
    const isAdmin = userEmail && adminEmails.includes(userEmail);

    if (!myDataOnly && !isAdmin) {
      return NextResponse.json(
        { success: false, error: '管理者権限が必要です' },
        { status: 403 }
      );
    }

    const userId = session.user.id;

    // レコード数を取得
    const { getTableCounts } = await import('@/lib/backup');
    const counts = await getTableCounts(userId);

    return NextResponse.json({
      success: true,
      counts,
      userId,
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
