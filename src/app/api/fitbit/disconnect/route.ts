/**
 * Fitbit Disconnect Endpoint
 * DELETE /api/fitbit/disconnect
 *
 * Revokes Fitbit tokens and removes connection
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getOAuthConfig, revokeToken } from '@/lib/fitbit';

export async function DELETE() {
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

    // Get current Fitbit account
    const fitbitAccount = await prisma.fitbitAccount.findUnique({
      where: { userId },
    });

    if (!fitbitAccount) {
      return NextResponse.json(
        { success: false, error: 'Fitbit連携が見つかりません' },
        { status: 404 }
      );
    }

    // Revoke token at Fitbit
    try {
      const config = getOAuthConfig();
      await revokeToken(fitbitAccount.accessToken, config);
    } catch (error) {
      // Log but don't fail - token might already be invalid
      console.error('Token revocation error:', error);
    }

    // Delete FitbitAccount from database
    await prisma.fitbitAccount.delete({
      where: { userId },
    });

    return NextResponse.json({
      success: true,
      message: 'Fitbit連携を解除しました',
    });
  } catch (error) {
    console.error('Fitbit disconnect error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '連携解除に失敗しました',
      },
      { status: 500 }
    );
  }
}
