import prisma from '@/lib/prisma';

export type ErrorLevel = 'error' | 'warning' | 'info';
export type ErrorCategory =
  | 'llm_parse_fail'
  | 'llm_empty_response'
  | 'api_error'
  | 'api_timeout'
  | 'fitbit_sync_fail'
  | 'score_analysis_fail'
  | 'ocr_parse_fail'
  | 'anomaly_high_error_rate';

/**
 * 管理者向けエラーログを記録
 */
export async function logAdminError(
  level: ErrorLevel,
  category: ErrorCategory | string,
  message: string,
  metadata?: {
    userId?: string;
    endpoint?: string;
    stack?: string;
    requestBody?: any;
    responseBody?: any;
    [key: string]: any;
  }
): Promise<void> {
  try {
    await prisma.adminErrorLog.create({
      data: {
        level,
        category,
        message,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
        userId: metadata?.userId,
        endpoint: metadata?.endpoint,
      },
    });
  } catch (e) {
    console.error('[AdminErrorLog] Failed to log:', e);
  }
}
