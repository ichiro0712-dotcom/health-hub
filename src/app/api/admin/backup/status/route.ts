/**
 * バックアップステータスAPI
 * GET /api/admin/backup/status
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getTableCounts } from '@/lib/backup';
import { BACKUP_VERSION, TABLE_NAMES } from '@/lib/backup/types';

export async function GET() {
  try {
    // 認証チェック
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      );
    }

    // 全テーブルのレコード数を取得
    const tableCounts = await getTableCounts();

    // 合計レコード数
    const totalRecords = Object.values(tableCounts).reduce((sum, count) => sum + count, 0);

    return NextResponse.json({
      success: true,
      status: {
        backupVersion: BACKUP_VERSION,
        availableTables: TABLE_NAMES,
        tableCounts,
        totalRecords,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Status error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'ステータス取得に失敗しました',
      },
      { status: 500 }
    );
  }
}
