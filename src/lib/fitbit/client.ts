/**
 * Fitbit Web API Client
 */

import prisma from '@/lib/prisma';
import { getOAuthConfig, refreshAccessToken, isTokenExpired, calculateExpirationDate } from './oauth';
import {
  FitbitActivitySummary,
  FitbitHeartRateResponse,
  FitbitHrvResponse,
  FitbitSleepResponse,
  FitbitSpO2Response,
  FitbitBreathingRateResponse,
  FitbitTemperatureResponse,
  FitbitWeightResponse,
  FitbitUserProfile,
  FitbitApiError,
} from './types';

const FITBIT_API_BASE = 'https://api.fitbit.com';

/**
 * Format date for Fitbit API (YYYY-MM-DD)
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get valid access token for user, refreshing if necessary
 */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const fitbitAccount = await prisma.fitbitAccount.findUnique({
    where: { userId },
  });

  if (!fitbitAccount) {
    return null;
  }

  // Check if token is expired or about to expire
  if (isTokenExpired(fitbitAccount.expiresAt)) {
    try {
      const config = getOAuthConfig();
      const newTokens = await refreshAccessToken(fitbitAccount.refreshToken, config);

      // Update stored tokens
      await prisma.fitbitAccount.update({
        where: { userId },
        data: {
          accessToken: newTokens.access_token,
          refreshToken: newTokens.refresh_token,
          expiresAt: calculateExpirationDate(newTokens.expires_in),
        },
      });

      return newTokens.access_token;
    } catch (error) {
      console.error('Failed to refresh Fitbit token:', error);
      return null;
    }
  }

  return fitbitAccount.accessToken;
}

/**
 * Make authenticated request to Fitbit API
 */
async function fitbitFetch<T>(
  userId: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const accessToken = await getValidAccessToken(userId);

  if (!accessToken) {
    throw new Error('No valid Fitbit access token');
  }

  const url = `${FITBIT_API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const error: FitbitApiError = await response.json();
    console.error('Fitbit API error:', error);

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      throw new Error(`Rate limited. Retry after ${retryAfter} seconds.`);
    }

    throw new Error(error.errors?.[0]?.message || `Fitbit API error: ${response.status}`);
  }

  return response.json();
}

// =====================================================
// API Methods
// =====================================================

/**
 * Get user profile
 */
export async function getUserProfile(userId: string): Promise<FitbitUserProfile> {
  return fitbitFetch<FitbitUserProfile>(userId, '/1/user/-/profile.json');
}

/**
 * Get daily activity summary
 */
export async function getActivitySummary(
  userId: string,
  date: Date
): Promise<FitbitActivitySummary> {
  const dateStr = formatDate(date);
  return fitbitFetch<FitbitActivitySummary>(
    userId,
    `/1/user/-/activities/date/${dateStr}.json`
  );
}

/**
 * Get heart rate data with intraday
 */
export async function getHeartRate(
  userId: string,
  date: Date,
  detailLevel: '1sec' | '1min' = '1min'
): Promise<FitbitHeartRateResponse> {
  const dateStr = formatDate(date);
  return fitbitFetch<FitbitHeartRateResponse>(
    userId,
    `/1/user/-/activities/heart/date/${dateStr}/1d/${detailLevel}.json`
  );
}

/**
 * Get HRV (Heart Rate Variability) data
 */
export async function getHrvData(
  userId: string,
  date: Date
): Promise<FitbitHrvResponse> {
  const dateStr = formatDate(date);
  return fitbitFetch<FitbitHrvResponse>(
    userId,
    `/1/user/-/hrv/date/${dateStr}.json`
  );
}

/**
 * Get HRV data for date range
 */
export async function getHrvRange(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<FitbitHrvResponse> {
  const startStr = formatDate(startDate);
  const endStr = formatDate(endDate);
  return fitbitFetch<FitbitHrvResponse>(
    userId,
    `/1/user/-/hrv/date/${startStr}/${endStr}.json`
  );
}

/**
 * Get sleep data
 */
export async function getSleepData(
  userId: string,
  date: Date
): Promise<FitbitSleepResponse> {
  const dateStr = formatDate(date);
  return fitbitFetch<FitbitSleepResponse>(
    userId,
    `/1.2/user/-/sleep/date/${dateStr}.json`
  );
}

/**
 * Get sleep data for date range
 */
export async function getSleepRange(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<FitbitSleepResponse> {
  const startStr = formatDate(startDate);
  const endStr = formatDate(endDate);
  return fitbitFetch<FitbitSleepResponse>(
    userId,
    `/1.2/user/-/sleep/date/${startStr}/${endStr}.json`
  );
}

/**
 * Get SpO2 (Blood Oxygen) data
 */
export async function getSpO2Data(
  userId: string,
  date: Date
): Promise<FitbitSpO2Response> {
  const dateStr = formatDate(date);
  return fitbitFetch<FitbitSpO2Response>(
    userId,
    `/1/user/-/spo2/date/${dateStr}.json`
  );
}

/**
 * Get breathing rate data
 */
export async function getBreathingRate(
  userId: string,
  date: Date
): Promise<FitbitBreathingRateResponse> {
  const dateStr = formatDate(date);
  return fitbitFetch<FitbitBreathingRateResponse>(
    userId,
    `/1/user/-/br/date/${dateStr}.json`
  );
}

/**
 * Get breathing rate for date range
 */
export async function getBreathingRateRange(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<FitbitBreathingRateResponse> {
  const startStr = formatDate(startDate);
  const endStr = formatDate(endDate);
  return fitbitFetch<FitbitBreathingRateResponse>(
    userId,
    `/1/user/-/br/date/${startStr}/${endStr}.json`
  );
}

/**
 * Get skin temperature data
 */
export async function getTemperature(
  userId: string,
  date: Date
): Promise<FitbitTemperatureResponse> {
  const dateStr = formatDate(date);
  return fitbitFetch<FitbitTemperatureResponse>(
    userId,
    `/1/user/-/temp/skin/date/${dateStr}.json`
  );
}

/**
 * Get skin temperature for date range
 */
export async function getTemperatureRange(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<FitbitTemperatureResponse> {
  const startStr = formatDate(startDate);
  const endStr = formatDate(endDate);
  return fitbitFetch<FitbitTemperatureResponse>(
    userId,
    `/1/user/-/temp/skin/date/${startStr}/${endStr}.json`
  );
}

/**
 * Get body weight logs
 */
export async function getWeightLogs(
  userId: string,
  date: Date
): Promise<FitbitWeightResponse> {
  const dateStr = formatDate(date);
  return fitbitFetch<FitbitWeightResponse>(
    userId,
    `/1/user/-/body/log/weight/date/${dateStr}.json`
  );
}

/**
 * Get body weight for date range
 */
export async function getWeightRange(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<FitbitWeightResponse> {
  const startStr = formatDate(startDate);
  const endStr = formatDate(endDate);
  return fitbitFetch<FitbitWeightResponse>(
    userId,
    `/1/user/-/body/log/weight/date/${startStr}/${endStr}.json`
  );
}

// =====================================================
// Connection Status
// =====================================================

/**
 * Check if user has connected Fitbit
 */
export async function isFitbitConnected(userId: string): Promise<boolean> {
  const account = await prisma.fitbitAccount.findUnique({
    where: { userId },
    select: { id: true },
  });
  return !!account;
}

/**
 * Get Fitbit connection status
 */
export async function getFitbitStatus(userId: string) {
  const account = await prisma.fitbitAccount.findUnique({
    where: { userId },
    select: {
      fitbitUserId: true,
      scope: true,
      expiresAt: true,
      updatedAt: true,
    },
  });

  if (!account) {
    return {
      connected: false,
      fitbitUserId: null,
      scopes: [],
      expiresAt: null,
      lastSync: null,
    };
  }

  return {
    connected: true,
    fitbitUserId: account.fitbitUserId,
    scopes: account.scope.split(' '),
    expiresAt: account.expiresAt,
    lastSync: account.updatedAt,
    isExpired: isTokenExpired(account.expiresAt),
  };
}
