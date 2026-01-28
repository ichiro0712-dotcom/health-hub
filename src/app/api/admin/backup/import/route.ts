/**
 * データベースインポートAPI
 * POST /api/admin/backup/import
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { importDatabase, validateBackupFile, validateReferences } from '@/lib/backup';
import { BackupFile, ImportMode } from '@/lib/backup/types';

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

    if (!userEmail || !adminEmails.includes(userEmail)) {
      return NextResponse.json(
        { success: false, error: '管理者権限が必要です' },
        { status: 403 }
      );
    }

    // リクエストボディからバックアップデータを取得
    const contentType = request.headers.get('content-type') || '';
    let backup: BackupFile;

    if (contentType.includes('multipart/form-data')) {
      // FormDataとしてファイルを受け取る
      const formData = await request.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return NextResponse.json(
          { success: false, error: 'バックアップファイルが指定されていません' },
          { status: 400 }
        );
      }

      const text = await file.text();
      backup = JSON.parse(text);
    } else {
      // JSONとして直接受け取る
      backup = await request.json();
    }

    // クエリパラメータ
    const searchParams = request.nextUrl.searchParams;
    const mode = (searchParams.get('mode') || 'skip') as ImportMode;
    const tablesParam = searchParams.get('tables');
    const dryRun = searchParams.get('dryRun') === 'true';

    // バリデーション
    const structureValidation = validateBackupFile(backup);
    if (!structureValidation.valid) {
      return NextResponse.json({
        success: false,
        error: 'バックアップファイルの形式が無効です',
        validation: structureValidation,
      }, { status: 400 });
    }

    // 参照整合性チェック
    const refValidation = validateReferences(backup);
    if (!refValidation.valid && !dryRun) {
      return NextResponse.json({
        success: false,
        error: 'データの参照整合性に問題があります',
        validation: refValidation,
      }, { status: 400 });
    }

    // インポート実行
    const result = await importDatabase(backup, {
      mode,
      tables: tablesParam ? tablesParam.split(',').map(t => t.trim()) : undefined,
      dryRun,
    });

    if (dryRun) {
      return NextResponse.json({
        success: true,
        message: 'ドライラン完了（実際のインポートは行われていません）',
        preview: result,
        warnings: [...structureValidation.warnings, ...refValidation.warnings],
      });
    }

    return NextResponse.json({
      success: result.success,
      result,
      warnings: [...structureValidation.warnings, ...refValidation.warnings],
    });
  } catch (error) {
    console.error('Import error:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: 'JSONの解析に失敗しました。ファイル形式を確認してください。' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'インポートに失敗しました',
      },
      { status: 500 }
    );
  }
}

// バリデーションのみ実行（PUT）
export async function PUT(request: NextRequest) {
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

    if (!userEmail || !adminEmails.includes(userEmail)) {
      return NextResponse.json(
        { success: false, error: '管理者権限が必要です' },
        { status: 403 }
      );
    }

    // バックアップファイルを取得
    const contentType = request.headers.get('content-type') || '';
    let backup: BackupFile;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File;

      if (!file) {
        return NextResponse.json(
          { success: false, error: 'バックアップファイルが指定されていません' },
          { status: 400 }
        );
      }

      const text = await file.text();
      backup = JSON.parse(text);
    } else {
      backup = await request.json();
    }

    // バリデーション実行
    const structureValidation = validateBackupFile(backup);
    const refValidation = validateReferences(backup);

    return NextResponse.json({
      success: structureValidation.valid && refValidation.valid,
      structureValidation,
      refValidation,
      metadata: backup.metadata,
    });
  } catch (error) {
    console.error('Validation error:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: 'JSONの解析に失敗しました。' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'バリデーションに失敗しました',
      },
      { status: 500 }
    );
  }
}
