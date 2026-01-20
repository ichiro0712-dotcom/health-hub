/**
 * Fitbit Integration Module
 */

// Types
export * from './types';

// OAuth
export {
  getOAuthConfig,
  generatePKCEChallenge,
  generateState,
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  revokeToken,
  isTokenExpired,
  calculateExpirationDate,
  DEFAULT_SCOPES,
} from './oauth';

// API Client
export {
  getValidAccessToken,
  getUserProfile,
  getActivitySummary,
  getHeartRate,
  getHrvData,
  getHrvRange,
  getSleepData,
  getSleepRange,
  getSpO2Data,
  getBreathingRate,
  getBreathingRateRange,
  getTemperature,
  getTemperatureRange,
  getWeightLogs,
  getWeightRange,
  isFitbitConnected,
  getFitbitStatus,
} from './client';

// Sync Service
export { syncFitbitData } from './sync';
