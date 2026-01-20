/**
 * Fitbit Data Sync Endpoint
 * POST /api/fitbit/sync
 *
 * Triggers sync of Fitbit data to database
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { syncFitbitData, isFitbitConnected } from '@/lib/fitbit';
import { FitbitDataType } from '@/lib/fitbit/types';

export async function POST(request: NextRequest) {
  try {
    // Verify user is logged in
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      );
    }

    // @ts-ignore
    const userId = session.user.id;

    // Check if Fitbit is connected
    if (!(await isFitbitConnected(userId))) {
      return NextResponse.json(
        { success: false, error: 'Fitbitが連携されていません' },
        { status: 400 }
      );
    }

    // Parse request body for options
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    let dataTypes: FitbitDataType[] | undefined;

    try {
      const body = await request.json();
      if (body.startDate) startDate = new Date(body.startDate);
      if (body.endDate) endDate = new Date(body.endDate);
      if (body.dataTypes) dataTypes = body.dataTypes;
    } catch {
      // No body or invalid JSON - use defaults
    }

    // Perform sync
    const result = await syncFitbitData(userId, {
      startDate,
      endDate,
      dataTypes,
    });

    return NextResponse.json({
      success: result.success,
      syncedAt: result.syncedAt,
      errors: result.errors,
    });
  } catch (error) {
    console.error('Fitbit sync error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '同期に失敗しました',
      },
      { status: 500 }
    );
  }
}
