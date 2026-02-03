/**
 * Fitbit OAuth Callback Endpoint
 * GET /api/fitbit/callback
 *
 * Handles OAuth callback from Fitbit, exchanges code for tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import {
  getOAuthConfig,
  exchangeCodeForTokens,
  calculateExpirationDate,
} from '@/lib/fitbit';

export async function GET(request: NextRequest) {
  try {
    // Verify user is logged in
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.redirect(
        new URL('/settings/data-sync?error=unauthorized', request.url)
      );
    }

    // @ts-ignore
    const userId = session.user.id;

    // Get authorization code and state from query params
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Handle OAuth errors
    if (error) {
      console.error('Fitbit OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        new URL(`/settings/data-sync?error=${encodeURIComponent(errorDescription || error)}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/settings/data-sync?error=missing_params', request.url)
      );
    }

    // Retrieve stored PKCE verifier and verify state
    const fitbitAccount = await prisma.fitbitAccount.findUnique({
      where: { userId },
    });

    if (!fitbitAccount || !fitbitAccount.codeVerifier) {
      return NextResponse.redirect(
        new URL('/settings/data-sync?error=session_expired', request.url)
      );
    }

    // Verify state matches (stored in scope field with "pending:" prefix)
    const expectedState = fitbitAccount.scope?.replace('pending:', '');
    if (state !== expectedState) {
      console.error('State mismatch:', { received: state, expected: expectedState });
      return NextResponse.redirect(
        new URL('/settings/data-sync?error=state_mismatch', request.url)
      );
    }

    // Exchange code for tokens
    const config = getOAuthConfig();
    console.log('Fitbit OAuth callback - exchanging code for tokens');
    console.log('Config:', {
      clientId: config.clientId,
      redirectUri: config.redirectUri,
      hasClientSecret: !!config.clientSecret,
      clientSecretLength: config.clientSecret?.length,
    });
    console.log('Code verifier length:', fitbitAccount.codeVerifier?.length);

    const tokens = await exchangeCodeForTokens(
      code,
      fitbitAccount.codeVerifier,
      config
    );
    console.log('Token exchange successful, user_id:', tokens.user_id);

    // Update FitbitAccount with real tokens
    await prisma.fitbitAccount.update({
      where: { userId },
      data: {
        fitbitUserId: tokens.user_id,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: calculateExpirationDate(tokens.expires_in),
        scope: tokens.scope,
        tokenType: tokens.token_type,
        codeVerifier: null, // Clear temporary storage
      },
    });

    // Redirect to settings page with success
    return NextResponse.redirect(
      new URL('/settings/data-sync?success=connected', request.url)
    );
  } catch (error) {
    console.error('Fitbit callback error:', error);

    // Clean up failed attempt
    try {
      const session = await getServerSession(authOptions);
      if (session?.user) {
        // @ts-ignore
        await prisma.fitbitAccount.delete({
          // @ts-ignore
          where: { userId: session.user.id },
        }).catch(() => {
          // Ignore if already deleted
        });
      }
    } catch {
      // Ignore cleanup errors
    }

    return NextResponse.redirect(
      new URL(`/settings/data-sync?error=${encodeURIComponent(
        error instanceof Error ? error.message : 'Token exchange failed'
      )}`, request.url)
    );
  }
}
