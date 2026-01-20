/**
 * Fitbit Web API 型定義
 */

// OAuth Configuration
export interface FitbitOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: FitbitScope[];
}

// Available Fitbit OAuth Scopes
export type FitbitScope =
  | 'activity'
  | 'heartrate'
  | 'location'
  | 'nutrition'
  | 'oxygen_saturation'
  | 'profile'
  | 'respiratory_rate'
  | 'settings'
  | 'sleep'
  | 'social'
  | 'temperature'
  | 'weight';

// OAuth Token Response
export interface FitbitTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  token_type: string;
  user_id: string;
}

// OAuth Error Response
export interface FitbitOAuthError {
  errors: Array<{
    errorType: string;
    message: string;
  }>;
  success: false;
}

// PKCE Code Challenge
export interface PKCEChallenge {
  codeVerifier: string;
  codeChallenge: string;
}

// =====================================================
// Fitbit API Response Types
// =====================================================

// Activity Summary
export interface FitbitActivitySummary {
  activities: FitbitActivity[];
  summary: {
    activeScore: number;
    activityCalories: number;
    caloriesBMR: number;
    caloriesOut: number;
    distances: Array<{ activity: string; distance: number }>;
    fairlyActiveMinutes: number;
    lightlyActiveMinutes: number;
    marginalCalories: number;
    sedentaryMinutes: number;
    steps: number;
    veryActiveMinutes: number;
  };
  goals: {
    activeMinutes: number;
    caloriesOut: number;
    distance: number;
    steps: number;
  };
}

export interface FitbitActivity {
  activityId: number;
  activityParentId: number;
  activityParentName: string;
  calories: number;
  description: string;
  distance?: number;
  duration: number;
  hasActiveZoneMinutes: boolean;
  hasStartTime: boolean;
  isFavorite: boolean;
  lastModified: string;
  logId: number;
  name: string;
  startDate: string;
  startTime: string;
  steps?: number;
}

// Heart Rate Data
export interface FitbitHeartRateResponse {
  'activities-heart': Array<{
    dateTime: string;
    value: {
      customHeartRateZones: FitbitHeartRateZone[];
      heartRateZones: FitbitHeartRateZone[];
      restingHeartRate?: number;
    };
  }>;
  'activities-heart-intraday'?: {
    dataset: Array<{
      time: string;
      value: number;
    }>;
    datasetInterval: number;
    datasetType: string;
  };
}

export interface FitbitHeartRateZone {
  caloriesOut: number;
  max: number;
  min: number;
  minutes: number;
  name: string;
}

// HRV Data
export interface FitbitHrvResponse {
  hrv: Array<{
    dateTime: string;
    value: {
      dailyRmssd: number;
      deepRmssd: number;
    };
  }>;
}

// Sleep Data
export interface FitbitSleepResponse {
  sleep: FitbitSleepLog[];
  summary: {
    stages?: {
      deep: number;
      light: number;
      rem: number;
      wake: number;
    };
    totalMinutesAsleep: number;
    totalSleepRecords: number;
    totalTimeInBed: number;
  };
}

export interface FitbitSleepLog {
  dateOfSleep: string;
  duration: number;
  efficiency: number;
  endTime: string;
  infoCode: number;
  isMainSleep: boolean;
  levels: {
    data: FitbitSleepStage[];
    shortData?: FitbitSleepStage[];
    summary: {
      deep?: { count: number; minutes: number; thirtyDayAvgMinutes?: number };
      light?: { count: number; minutes: number; thirtyDayAvgMinutes?: number };
      rem?: { count: number; minutes: number; thirtyDayAvgMinutes?: number };
      wake?: { count: number; minutes: number; thirtyDayAvgMinutes?: number };
      asleep?: { count: number; minutes: number };
      awake?: { count: number; minutes: number };
      restless?: { count: number; minutes: number };
    };
  };
  logId: number;
  logType: 'auto_detected' | 'manual';
  minutesAfterWakeup: number;
  minutesAsleep: number;
  minutesAwake: number;
  minutesToFallAsleep: number;
  startTime: string;
  timeInBed: number;
  type: 'classic' | 'stages';
}

export interface FitbitSleepStage {
  dateTime: string;
  level: 'wake' | 'light' | 'deep' | 'rem' | 'asleep' | 'awake' | 'restless';
  seconds: number;
}

// SpO2 Data
export interface FitbitSpO2Response {
  dateTime: string;
  value: {
    avg: number;
    max: number;
    min: number;
  };
}

// Breathing Rate
export interface FitbitBreathingRateResponse {
  br: Array<{
    dateTime: string;
    value: {
      breathingRate: number;
    };
  }>;
}

// Skin Temperature
export interface FitbitTemperatureResponse {
  tempSkin: Array<{
    dateTime: string;
    value: {
      nightlyRelative: number;
    };
    logType: string;
  }>;
}

// Body Weight
export interface FitbitWeightResponse {
  weight: Array<{
    bmi: number;
    date: string;
    fat?: number;
    logId: number;
    source: string;
    time: string;
    weight: number;
  }>;
}

// User Profile
export interface FitbitUserProfile {
  user: {
    age: number;
    ambassador: boolean;
    autoStrideEnabled: boolean;
    avatar: string;
    avatar150: string;
    avatar640: string;
    averageDailySteps: number;
    clockTimeDisplayFormat: string;
    corporate: boolean;
    corporateAdmin: boolean;
    country: string;
    dateOfBirth: string;
    displayName: string;
    displayNameSetting: string;
    distanceUnit: string;
    encodedId: string;
    features: {
      exerciseGoal: boolean;
    };
    firstName: string;
    fullName: string;
    gender: string;
    glucoseUnit: string;
    height: number;
    heightUnit: string;
    isBugReportEnabled: boolean;
    isChild: boolean;
    isCoach: boolean;
    languageLocale: string;
    lastName: string;
    legalTermsAcceptRequired: boolean;
    locale: string;
    memberSince: string;
    mfaEnabled: boolean;
    offsetFromUTCMillis: number;
    sdkDeveloper: boolean;
    sleepTracking: string;
    startDayOfWeek: string;
    strideLengthRunning: number;
    strideLengthRunningType: string;
    strideLengthWalking: number;
    strideLengthWalkingType: string;
    swimUnit: string;
    temperatureUnit: string;
    timezone: string;
    topBadges: Array<{
      badgeGradientEndColor: string;
      badgeGradientStartColor: string;
      badgeType: string;
      category: string;
      cheers: unknown[];
      dateTime: string;
      description: string;
      earnedMessage: string;
      encodedId: string;
      image100px: string;
      image125px: string;
      image300px: string;
      image50px: string;
      image75px: string;
      marketingDescription: string;
      mobileDescription: string;
      name: string;
      shareImage640px: string;
      shareText: string;
      shortDescription: string;
      shortName: string;
      timesAchieved: number;
      value: number;
    }>;
    visibleUser: boolean;
    waterUnit: string;
    waterUnitName: string;
    weight: number;
    weightUnit: string;
  };
}

// =====================================================
// Internal Types
// =====================================================

// Sync Status
export interface FitbitSyncStatus {
  connected: boolean;
  lastSync?: Date;
  scopes: string[];
  expiresAt?: Date;
}

// Sync Options
export interface FitbitSyncOptions {
  startDate?: Date;
  endDate?: Date;
  dataTypes?: FitbitDataType[];
}

export type FitbitDataType =
  | 'activity'
  | 'heartrate'
  | 'hrv'
  | 'sleep'
  | 'spo2'
  | 'breathing'
  | 'temperature'
  | 'weight';

// Sync Result
export interface FitbitSyncResult {
  success: boolean;
  syncedAt: Date;
  data: {
    activity?: FitbitActivitySummary;
    heartRate?: FitbitHeartRateResponse;
    hrv?: FitbitHrvResponse;
    sleep?: FitbitSleepResponse;
    spo2?: FitbitSpO2Response;
    breathingRate?: FitbitBreathingRateResponse;
    temperature?: FitbitTemperatureResponse;
    weight?: FitbitWeightResponse;
  };
  errors: Array<{
    type: FitbitDataType;
    message: string;
  }>;
}

// API Error
export interface FitbitApiError {
  errors: Array<{
    errorType: string;
    fieldName?: string;
    message: string;
  }>;
  success: false;
}
