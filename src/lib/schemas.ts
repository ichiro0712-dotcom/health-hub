/**
 * Zod スキーマ定義
 * アプリケーション全体で使用するバリデーションスキーマ
 */

import { z } from 'zod';

// 健康診断結果のスキーマ
export const healthCheckResultSchema = z.object({
    item: z.string().min(1).max(100).optional(),
    name: z.string().min(1).max(100).optional(),
    category: z.string().max(50).optional(),
    value: z.union([z.string(), z.number()]).optional(),
    unit: z.string().max(30).optional(),
    referenceRange: z.string().max(100).optional(),
    evaluation: z.string().max(50).optional(),
    isAbnormal: z.boolean().optional(),
}).refine(data => data.item || data.name, {
    message: "item または name のいずれかが必要です"
});

// 健康記録メタデータのスキーマ
export const healthRecordMetaSchema = z.object({
    hospitalName: z.string().max(200).optional(),
    age: z.number().int().min(0).max(150).optional(),
    notes: z.string().max(10000).optional(),
    findings: z.string().max(10000).optional(),
    sections: z.array(z.object({
        title: z.string().max(100).optional(),
        content: z.string().max(10000).optional(),
    })).optional(),
}).passthrough();

// 健康記録入力のスキーマ
export const healthRecordInputSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日付はYYYY-MM-DD形式で入力してください").or(z.string().datetime()),
    title: z.string().max(200).optional(),
    summary: z.string().max(5000).optional(),
    results: z.array(healthCheckResultSchema).max(500),
    meta: healthRecordMetaSchema.optional(),
    images: z.array(z.string()).max(20).optional(),
});

// 習慣記録のスキーマ
export const habitRecordSchema = z.object({
    date: z.string().or(z.date()),
    value: z.number().nullable(),
});

// 習慣のスキーマ
export const habitSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1).max(100),
    type: z.enum(['yes_no', 'numeric']),
    unit: z.string().max(30).nullable().optional(),
    records: z.array(habitRecordSchema).optional(),
});

// Google Docs設定のスキーマ
export const googleDocsSettingsSchema = z.object({
    recordsDocId: z.string().max(100).nullable().optional(),
    profileDocId: z.string().max(100).nullable().optional(),
    recordsHeaderText: z.string().max(5000).nullable().optional(),
    profileHeaderText: z.string().max(5000).nullable().optional(),
    autoSyncEnabled: z.boolean().optional(),
});

// バックアップインポートのスキーマ
export const backupImportOptionsSchema = z.object({
    mode: z.enum(['skip', 'overwrite', 'merge']).default('skip'),
    tables: z.array(z.string()).optional(),
    dryRun: z.boolean().default(false),
});

// ユーザー入力のサニタイズ関数
export function sanitizeUserInput(input: string): string {
    return input
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // 制御文字を削除
        .trim();
}

// バリデーション結果の型
export type ValidationResult<T> =
    | { success: true; data: T }
    | { success: false; error: string; issues?: z.ZodIssue[] };

// バリデーション関数
export function validateHealthRecordInput(data: unknown): ValidationResult<z.infer<typeof healthRecordInputSchema>> {
    const result = healthRecordInputSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return {
        success: false,
        error: result.error.issues.map(i => i.message).join(', '),
        issues: result.error.issues,
    };
}

export function validateGoogleDocsSettings(data: unknown): ValidationResult<z.infer<typeof googleDocsSettingsSchema>> {
    const result = googleDocsSettingsSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return {
        success: false,
        error: result.error.issues.map(i => i.message).join(', '),
        issues: result.error.issues,
    };
}

export function validateHabit(data: unknown): ValidationResult<z.infer<typeof habitSchema>> {
    const result = habitSchema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return {
        success: false,
        error: result.error.issues.map(i => i.message).join(', '),
        issues: result.error.issues,
    };
}

// 型エクスポート
export type HealthCheckResult = z.infer<typeof healthCheckResultSchema>;
export type HealthRecordInput = z.infer<typeof healthRecordInputSchema>;
export type HealthRecordMeta = z.infer<typeof healthRecordMetaSchema>;
export type Habit = z.infer<typeof habitSchema>;
export type GoogleDocsSettings = z.infer<typeof googleDocsSettingsSchema>;
