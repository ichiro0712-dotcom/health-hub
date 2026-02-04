/**
 * Fitbit OAuth Authorization Endpoint
 * GET /api/fitbit/auth
 *
 * Initiates OAuth 2.0 PKCE flow by redirecting to Fitbit
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import {
  getOAuthConfig,
  generatePKCEChallenge,
  generateState,
  buildAuthorizationUrl,
} from '@/lib/fitbit';

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

    // Get OAuth config
    const config = getOAuthConfig();

    // Generate PKCE challenge
    const pkce = generatePKCEChallenge();

    // Generate state for CSRF protection
    const state = generateState();

    // Store PKCE verifier and state temporarily
    // We'll use FitbitAccount table with a temporary entry or a separate state table
    // For simplicity, we store it in FitbitAccount (will be updated on callback)
    await prisma.fitbitAccount.upsert({
      where: { userId },
      update: {
        codeVerifier: pkce.codeVerifier,
        // Store state in scope field temporarily (will be overwritten)
        scope: `pending:${state}`,
      },
      create: {
        userId,
        fitbitUserId: 'pending',
        accessToken: 'pending',
        refreshToken: 'pending',
        expiresAt: new Date(),
        scope: `pending:${state}`,
        codeVerifier: pkce.codeVerifier,
      },
    });

    // Build authorization URL
    const authUrl = buildAuthorizationUrl(config, pkce, state);

    // Redirect to Fitbit
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Fitbit auth error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Authorization failed',
      },
      { status: 500 }
    );
  }
}
