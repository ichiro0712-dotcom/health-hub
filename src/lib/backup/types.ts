/**
 * バックアップ・復元機能の型定義
 */

// バックアップメタデータ
export interface BackupMetadata {
  version: string;
  exportedAt: string;
  appVersion: string;
  tables: string[];
  userId?: string; // ユーザー単位エクスポート時
  recordCounts: Record<string, number>;
}

// バックアップファイル全体の構造
export interface BackupFile {
  metadata: BackupMetadata;
  data: BackupData;
}

// 各テーブルのデータ
export interface BackupData {
  MasterItem?: MasterItemBackup[];
  User?: UserBackup[];
  Account?: AccountBackup[];
  Session?: SessionBackup[];
  FitData?: FitDataBackup[];
  HealthRecord?: HealthRecordBackup[];
  UserHealthItemSetting?: UserHealthItemSettingBackup[];
  LifestyleHabit?: LifestyleHabitBackup[];
  Supplement?: SupplementBackup[];
  InspectionItem?: InspectionItemBackup[];
  InspectionItemAlias?: InspectionItemAliasBackup[];
  InspectionItemHistory?: InspectionItemHistoryBackup[];
  // Fitbit Integration Tables
  FitbitAccount?: FitbitAccountBackup[];
  HrvData?: HrvDataBackup[];
  DetailedSleep?: DetailedSleepBackup[];
  IntradayHeartRate?: IntradayHeartRateBackup[];
}

// 各テーブルのバックアップ型
export interface MasterItemBackup {
  code: string;
  standardName: string;
  jlac10: string | null;
  synonyms: string[];
}

export interface UserBackup {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: string | null;
  image: string | null;
  birthDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccountBackup {
  id: string;
  userId: string;
  type: string;
  provider: string;
  providerAccountId: string;
  refresh_token: string | null;
  access_token: string | null;
  expires_at: number | null;
  token_type: string | null;
  scope: string | null;
  id_token: string | null;
  session_state: string | null;
}

export interface SessionBackup {
  id: string;
  sessionToken: string;
  userId: string;
  expires: string;
}

export interface FitDataBackup {
  id: string;
  userId: string;
  date: string;
  heartRate: number | null;
  steps: number | null;
  weight: number | null;
  raw: unknown | null;
  distance: number | null;
  calories: number | null;
  sleepMinutes: number | null;
  sleepData: unknown | null;
  vitals: unknown | null;
  workouts: unknown | null;
  // Fitbit integration fields
  source: string | null;
  fitbitSyncId: string | null;
  respiratoryRate: number | null;
  skinTemperature: number | null;
  syncedAt: string;
}

export interface HealthRecordBackup {
  id: string;
  userId: string;
  date: string;
  status: string;
  title: string | null;
  summary: string | null;
  data: unknown;
  additional_data: unknown | null;
  images: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UserHealthItemSettingBackup {
  id: string;
  userId: string;
  itemName: string;
  minVal: number;
  maxVal: number;
  safeMin: number | null;
  safeMax: number | null;
  tags: string[];
  updatedAt: string;
}

export interface LifestyleHabitBackup {
  id: string;
  userId: string;
  category: string;
  name: string;
  value: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface SupplementBackup {
  id: string;
  userId: string;
  name: string;
  timing: string[];
  order: number;
  amount: string;
  unit: string;
  manufacturer: string | null;
  note: string | null;
  startDate: string | null;
  pausedPeriods: unknown | null;
  createdAt: string;
  updatedAt: string;
}

export interface InspectionItemBackup {
  id: string;
  userId: string;
  name: string;
  masterItemCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InspectionItemAliasBackup {
  id: string;
  inspectionItemId: string;
  originalName: string;
}

export interface InspectionItemHistoryBackup {
  id: string;
  inspectionItemId: string;
  operationType: string;
  details: unknown;
  undoCommand: string;
  createdAt: string;
}

// Fitbit Integration Backup Types
export interface FitbitAccountBackup {
  id: string;
  userId: string;
  fitbitUserId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  scope: string;
  tokenType: string;
  codeVerifier: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HrvDataBackup {
  id: string;
  userId: string;
  date: string;
  dailyRmssd: number;
  deepRmssd: number | null;
  coverage: number | null;
  lowFrequency: number | null;
  highFrequency: number | null;
  raw: unknown | null;
  syncedAt: string;
}

export interface DetailedSleepBackup {
  id: string;
  userId: string;
  date: string;
  logId: string;
  startTime: string;
  endTime: string;
  duration: number;
  efficiency: number;
  minutesAwake: number;
  minutesLight: number;
  minutesDeep: number;
  minutesRem: number;
  stages: unknown;
  raw: unknown | null;
  syncedAt: string;
}

export interface IntradayHeartRateBackup {
  id: string;
  userId: string;
  date: string;
  restingHeartRate: number | null;
  outOfRangeMinutes: number | null;
  fatBurnMinutes: number | null;
  cardioMinutes: number | null;
  peakMinutes: number | null;
  intradayData: unknown;
  raw: unknown | null;
  syncedAt: string;
}

// インポートオプション
export type ImportMode = 'overwrite' | 'skip' | 'merge';

export interface ImportOptions {
  mode: ImportMode;
  tables?: string[]; // 特定テーブルのみインポート
  dryRun?: boolean; // テスト実行
}

// インポート結果
export interface ImportResult {
  success: boolean;
  imported: Record<string, number>;
  skipped: Record<string, number>;
  errors: ImportError[];
  duration: number;
}

export interface ImportError {
  table: string;
  recordId?: string;
  message: string;
  details?: unknown;
}

// エクスポートオプション
export interface ExportOptions {
  tables?: string[]; // 特定テーブルのみエクスポート
  userId?: string; // ユーザー単位エクスポート
  compress?: boolean; // gzip圧縮
}

// バリデーション結果
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  table: string;
  field?: string;
  message: string;
}

export interface ValidationWarning {
  table: string;
  message: string;
}

// テーブル名の列挙
export const TABLE_NAMES = [
  'MasterItem',
  'User',
  'Account',
  'Session',
  'FitData',
  'HealthRecord',
  'UserHealthItemSetting',
  'LifestyleHabit',
  'Supplement',
  'InspectionItem',
  'InspectionItemAlias',
  'InspectionItemHistory',
  // Fitbit Integration Tables
  'FitbitAccount',
  'HrvData',
  'DetailedSleep',
  'IntradayHeartRate',
] as const;

export type TableName = typeof TABLE_NAMES[number];

// インポート順序 (依存関係を考慮)
export const IMPORT_ORDER: TableName[] = [
  'MasterItem',
  'User',
  'Account',
  'Session',
  'FitbitAccount', // After User
  'FitData',
  'HealthRecord',
  'UserHealthItemSetting',
  'LifestyleHabit',
  'Supplement',
  'InspectionItem',
  'InspectionItemAlias',
  'InspectionItemHistory',
  'HrvData',
  'DetailedSleep',
  'IntradayHeartRate',
];

// 現在のバックアップフォーマットバージョン
export const BACKUP_VERSION = '1.0.0';
