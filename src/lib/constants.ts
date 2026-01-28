/**
 * アプリケーション全体で使用する定数
 */

// 健康記録のステータス
export const HEALTH_RECORD_STATUS = {
    PENDING: 'pending',
    VERIFIED: 'verified',
} as const;

export type HealthRecordStatus = typeof HEALTH_RECORD_STATUS[keyof typeof HEALTH_RECORD_STATUS];

// 習慣のタイプ
export const HABIT_TYPE = {
    YES_NO: 'yes_no',
    NUMERIC: 'numeric',
} as const;

export type HabitType = typeof HABIT_TYPE[keyof typeof HABIT_TYPE];

// Fitbit同期設定
export const FITBIT_CONFIG = {
    DEFAULT_SYNC_DAYS: 7,
    MAX_SYNC_DAYS: 30,
    MAX_CONCURRENT_REQUESTS: 10,
    RETRY_ATTEMPTS: 3,
} as const;

// Google Docs同期設定
export const GOOGLE_DOCS_CONFIG = {
    DEFAULT_RECORDS_DOC_ID: '1qCYtdo40Adk_-cG8vcwPkwlPW6NKHq97zeIX-EB0F3Y',
    DEFAULT_PROFILE_DOC_ID: '1sHZtZpcFE3Gv8IT8AZZftk3xnCCOUcVwfkC9NuzRanA',
} as const;

// エラーメッセージ（統一）
export const ERROR_MESSAGES = {
    UNAUTHORIZED: '認証が必要です',
    FORBIDDEN: '権限がありません',
    NOT_FOUND: 'データが見つかりません',
    USER_NOT_FOUND: 'ユーザーが見つかりません',
    INVALID_INPUT: '入力が無効です',
    SERVER_ERROR: 'サーバーエラーが発生しました',
    FETCH_FAILED: 'データの取得に失敗しました',
    SAVE_FAILED: '保存に失敗しました',
    DELETE_FAILED: '削除に失敗しました',
    SYNC_FAILED: '同期に失敗しました',
} as const;

// 週平均計算の期間定義
export const WEEKLY_AVERAGE_PERIODS = [
    { key: 'week', label: '過去1週間', days: 7, weeksLabel: '1週間' },
    { key: 'threeMonths', label: '過去3ヶ月', days: 90, weeksLabel: '約13週' },
    { key: 'halfYear', label: '過去半年', days: 182, weeksLabel: '約26週' },
    { key: 'year', label: '過去1年', days: 365, weeksLabel: '52週' },
    { key: 'all', label: '全期間', days: null, weeksLabel: '全期間' },
] as const;

export type WeeklyAveragePeriodKey = typeof WEEKLY_AVERAGE_PERIODS[number]['key'];
