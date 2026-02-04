/**
 * Fitbit Connection Status Endpoint
 * GET /api/fitbit/status
 *
 * Returns current Fitbit connection status
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getFitbitStatus } from '@/lib/fitbit';

export async function GET() {
  try {
    // Verify user is logged in
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get Fitbit status
    const status = await getFitbitStatus(userId);

    return NextResponse.json({
      success: true,
      ...status,
    });
  } catch (error) {
    console.error('Fitbit status error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'ステータス取得に失敗しました',
      },
      { status: 500 }
    );
  }
}
