/**
 * 構造化ロガー
 * 本番環境では構造化JSON、開発環境では読みやすいフォーマットで出力
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
    [key: string]: unknown;
}

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: LogContext;
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
}

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

// 環境に応じたログレベル
const MIN_LOG_LEVEL = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

function shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LOG_LEVEL];
}

function formatError(error: unknown): LogEntry['error'] | undefined {
    if (error instanceof Error) {
        return {
            name: error.name,
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        };
    }
    if (error) {
        return {
            name: 'UnknownError',
            message: String(error),
        };
    }
    return undefined;
}

function createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: unknown
): LogEntry {
    return {
        timestamp: new Date().toISOString(),
        level,
        message,
        context: context && Object.keys(context).length > 0 ? context : undefined,
        error: formatError(error),
    };
}

function outputLog(entry: LogEntry): void {
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
        // 本番環境: JSON形式で出力（ログ収集サービス向け）
        const output = JSON.stringify(entry);
        switch (entry.level) {
            case 'error':
                console.error(output);
                break;
            case 'warn':
                console.warn(output);
                break;
            default:
                console.log(output);
        }
    } else {
        // 開発環境: 読みやすいフォーマット
        const levelColors: Record<LogLevel, string> = {
            debug: '\x1b[36m', // cyan
            info: '\x1b[32m',  // green
            warn: '\x1b[33m',  // yellow
            error: '\x1b[31m', // red
        };
        const reset = '\x1b[0m';
        const color = levelColors[entry.level];

        let output = `${color}[${entry.level.toUpperCase()}]${reset} ${entry.message}`;

        if (entry.context) {
            output += ` ${JSON.stringify(entry.context)}`;
        }

        if (entry.error) {
            output += `\n  Error: ${entry.error.message}`;
            if (entry.error.stack) {
                output += `\n  ${entry.error.stack}`;
            }
        }

        switch (entry.level) {
            case 'error':
                console.error(output);
                break;
            case 'warn':
                console.warn(output);
                break;
            default:
                console.log(output);
        }
    }
}

/**
 * ロガーインスタンス
 */
export const logger = {
    debug(message: string, context?: LogContext): void {
        if (shouldLog('debug')) {
            outputLog(createLogEntry('debug', message, context));
        }
    },

    info(message: string, context?: LogContext): void {
        if (shouldLog('info')) {
            outputLog(createLogEntry('info', message, context));
        }
    },

    warn(message: string, context?: LogContext, error?: unknown): void {
        if (shouldLog('warn')) {
            outputLog(createLogEntry('warn', message, context, error));
        }
    },

    error(message: string, context?: LogContext, error?: unknown): void {
        if (shouldLog('error')) {
            outputLog(createLogEntry('error', message, context, error));
        }
    },

    /**
     * 特定の操作をラップしてログを出力
     */
    async withLogging<T>(
        operation: string,
        fn: () => Promise<T>,
        context?: LogContext
    ): Promise<T> {
        const startTime = Date.now();
        this.debug(`Starting: ${operation}`, context);

        try {
            const result = await fn();
            const duration = Date.now() - startTime;
            this.info(`Completed: ${operation}`, { ...context, durationMs: duration });
            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
            this.error(`Failed: ${operation}`, { ...context, durationMs: duration }, error);
            throw error;
        }
    },
};

export default logger;
