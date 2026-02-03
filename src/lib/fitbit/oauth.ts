/**
 * Fitbit OAuth 2.0 PKCE Implementation
 */

import { randomBytes, createHash } from 'crypto';
import { FitbitOAuthConfig, FitbitScope, FitbitTokenResponse, PKCEChallenge } from './types';

// Fitbit OAuth Endpoints
const FITBIT_AUTH_URL = 'https://www.fitbit.com/oauth2/authorize';
const FITBIT_TOKEN_URL = 'https://api.fitbit.com/oauth2/token';
const FITBIT_REVOKE_URL = 'https://api.fitbit.com/oauth2/revoke';

// Default scopes for this application
export const DEFAULT_SCOPES: FitbitScope[] = [
  'activity',
  'heartrate',
  'sleep',
  'oxygen_saturation',
  'respiratory_rate',
  'temperature',
  'weight',
  'profile',
];

/**
 * Get OAuth configuration from environment variables
 */
export function getOAuthConfig(): FitbitOAuthConfig {
  const clientId = process.env.FITBIT_CLIENT_ID;
  const clientSecret = process.env.FITBIT_CLIENT_SECRET;
  const redirectUri = process.env.FITBIT_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/fitbit/callback`;

  if (!clientId || !clientSecret) {
    throw new Error('FITBIT_CLIENT_ID and FITBIT_CLIENT_SECRET must be set');
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    scopes: DEFAULT_SCOPES,
  };
}

/**
 * Generate PKCE code verifier and challenge
 */
export function generatePKCEChallenge(): PKCEChallenge {
  // Generate 32-byte random string for code verifier
  const codeVerifier = randomBytes(32)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
    .substring(0, 128);

  // Generate code challenge using SHA256
  const hash = createHash('sha256').update(codeVerifier).digest('base64');
  const codeChallenge = hash
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return { codeVerifier, codeChallenge };
}

/**
 * Generate state parameter for OAuth
 */
export function generateState(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Build Fitbit authorization URL
 */
export function buildAuthorizationUrl(
  config: FitbitOAuthConfig,
  pkceChallenge: PKCEChallenge,
  state: string
): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    code_challenge: pkceChallenge.codeChallenge,
    code_challenge_method: 'S256',
    redirect_uri: config.redirectUri,
    scope: config.scopes.join(' '),
    state,
    // Fitbit specific params
    prompt: 'login consent', // Force re-consent for scope changes
  });

  return `${FITBIT_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 *
 * Server type: Use Basic Auth header (client_id:client_secret)
 * Body contains: grant_type, code, code_verifier, redirect_uri (NO client_id in body)
 */
export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  config: FitbitOAuthConfig
): Promise<FitbitTokenResponse> {
  // Debug: Log credential info for troubleshooting
  console.log('Token exchange - Credential check:', {
    clientIdLength: config.clientId?.length,
    clientSecretLength: config.clientSecret?.length,
    redirectUri: config.redirectUri,
    codeLength: code?.length,
    codeVerifierLength: codeVerifier?.length,
  });

  // Server type: Use Basic Auth, do NOT include client_id in body
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    code_verifier: codeVerifier,
    redirect_uri: config.redirectUri,
  });

  // Basic Auth header with client credentials
  const basicAuth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
  console.log('Basic Auth created, length:', basicAuth.length);

  const response = await fetch(FITBIT_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${basicAuth}`,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Token exchange failed - Status:', response.status);
    console.error('Token exchange failed - Response:', errorText);

    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
    }
    throw new Error(errorData.errors?.[0]?.message || `Failed to exchange authorization code: ${response.status}`);
  }

  return response.json();
}

/**
 * Refresh access token using refresh token
 *
 * Server type: Use Basic Auth header
 */
export async function refreshAccessToken(
  refreshToken: string,
  config: FitbitOAuthConfig
): Promise<FitbitTokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const basicAuth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

  const response = await fetch(FITBIT_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${basicAuth}`,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Token refresh failed:', error);
    throw new Error(error.errors?.[0]?.message || 'Failed to refresh access token');
  }

  return response.json();
}

/**
 * Revoke access token (disconnect)
 *
 * Server type: Use Basic Auth header
 */
export async function revokeToken(
  token: string,
  config: FitbitOAuthConfig
): Promise<void> {
  const params = new URLSearchParams({
    token,
  });

  const basicAuth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

  const response = await fetch(FITBIT_REVOKE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${basicAuth}`,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('Token revocation failed:', error);
    throw new Error(error.errors?.[0]?.message || 'Failed to revoke token');
  }
}

/**
 * Check if token is expired or about to expire
 */
export function isTokenExpired(expiresAt: Date, bufferMinutes: number = 5): boolean {
  const buffer = bufferMinutes * 60 * 1000; // Convert to milliseconds
  return new Date().getTime() > expiresAt.getTime() - buffer;
}

/**
 * Calculate token expiration date from expires_in
 */
export function calculateExpirationDate(expiresIn: number): Date {
  return new Date(Date.now() + expiresIn * 1000);
}
