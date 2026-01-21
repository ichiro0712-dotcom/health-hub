/**
 * データベースインポート機能
 */

import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// JSON フィールド用のヘルパー関数
function toJsonValue(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (value === null) return Prisma.JsonNull;
  if (value === undefined) return undefined;
  return value as Prisma.InputJsonValue;
}
import {
  BackupFile,
  ImportOptions,
  ImportResult,
  ImportError,
  IMPORT_ORDER,
  TableName,
} from './types';
import { validateBackupFile, validateReferences } from './validator';

/**
 * バックアップファイルからデータを復元
 */
export async function importDatabase(
  backup: BackupFile,
  options: ImportOptions
): Promise<ImportResult> {
  const startTime = Date.now();
  const { mode, tables: targetTables, dryRun } = options;

  const imported: Record<string, number> = {};
  const skipped: Record<string, number> = {};
  const errors: ImportError[] = [];

  // バリデーション
  const structureValidation = validateBackupFile(backup);
  if (!structureValidation.valid) {
    return {
      success: false,
      imported,
      skipped,
      errors: structureValidation.errors.map(e => ({
        table: e.table,
        recordId: e.field,
        message: e.message,
      })),
      duration: Date.now() - startTime,
    };
  }

  // 参照整合性チェック
  const refValidation = validateReferences(backup);
  if (!refValidation.valid) {
    return {
      success: false,
      imported,
      skipped,
      errors: refValidation.errors.map(e => ({
        table: e.table,
        recordId: e.field,
        message: e.message,
      })),
      duration: Date.now() - startTime,
    };
  }

  // ドライランの場合はここで終了
  if (dryRun) {
    const data = backup.data;
    for (const table of IMPORT_ORDER) {
      const tableData = (data as Record<string, unknown[]>)[table];
      if (tableData) {
        imported[table] = tableData.length;
      }
    }
    return {
      success: true,
      imported,
      skipped,
      errors,
      duration: Date.now() - startTime,
    };
  }

  // トランザクションで実行
  try {
    await prisma.$transaction(async (tx) => {
      for (const table of IMPORT_ORDER) {
        // ターゲットテーブルが指定されている場合はフィルタ
        if (targetTables && !targetTables.includes(table)) {
          continue;
        }

        const tableData = (backup.data as Record<string, unknown[]>)[table];
        if (!tableData || tableData.length === 0) {
          continue;
        }

        const result = await importTable(tx, table, tableData, mode);
        imported[table] = result.imported;
        skipped[table] = result.skipped;
        errors.push(...result.errors);
      }
    });

    return {
      success: errors.length === 0,
      imported,
      skipped,
      errors,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    errors.push({
      table: 'transaction',
      message: `トランザクションエラー: ${error instanceof Error ? error.message : String(error)}`,
    });

    return {
      success: false,
      imported,
      skipped,
      errors,
      duration: Date.now() - startTime,
    };
  }
}

/**
 * 個別テーブルのインポート
 */
async function importTable(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  table: TableName,
  data: unknown[],
  mode: ImportOptions['mode']
): Promise<{ imported: number; skipped: number; errors: ImportError[] }> {
  let imported = 0;
  let skippedCount = 0;
  const errors: ImportError[] = [];

  for (const record of data) {
    try {
      const success = await upsertRecord(tx, table, record as Record<string, unknown>, mode);
      if (success) {
        imported++;
      } else {
        skippedCount++;
      }
    } catch (error) {
      errors.push({
        table,
        recordId: (record as Record<string, unknown>).id as string,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { imported, skipped: skippedCount, errors };
}

/**
 * レコードのupsert処理
 */
async function upsertRecord(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  table: TableName,
  record: Record<string, unknown>,
  mode: ImportOptions['mode']
): Promise<boolean> {
  switch (table) {
    case 'MasterItem':
      return await upsertMasterItem(tx, record, mode);
    case 'User':
      return await upsertUser(tx, record, mode);
    case 'Account':
      return await upsertAccount(tx, record, mode);
    case 'Session':
      return await upsertSession(tx, record, mode);
    case 'FitData':
      return await upsertFitData(tx, record, mode);
    case 'HealthRecord':
      return await upsertHealthRecord(tx, record, mode);
    case 'UserHealthItemSetting':
      return await upsertUserHealthItemSetting(tx, record, mode);
    case 'LifestyleHabit':
      return await upsertLifestyleHabit(tx, record, mode);
    case 'Supplement':
      return await upsertSupplement(tx, record, mode);
    case 'InspectionItem':
      return await upsertInspectionItem(tx, record, mode);
    case 'InspectionItemAlias':
      return await upsertInspectionItemAlias(tx, record, mode);
    case 'InspectionItemHistory':
      return await upsertInspectionItemHistory(tx, record, mode);
    default:
      return false;
  }
}

// 各テーブルのupsert関数
type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function upsertMasterItem(tx: TxClient, record: Record<string, unknown>, mode: ImportOptions['mode']): Promise<boolean> {
  const existing = await tx.masterItem.findUnique({ where: { code: record.code as string } });

  if (existing && mode === 'skip') return false;

  await tx.masterItem.upsert({
    where: { code: record.code as string },
    update: mode === 'overwrite' ? {
      standardName: record.standardName as string,
      jlac10: record.jlac10 as string | null,
      synonyms: record.synonyms as string[],
    } : {},
    create: {
      code: record.code as string,
      standardName: record.standardName as string,
      jlac10: record.jlac10 as string | null,
      synonyms: record.synonyms as string[] || [],
    },
  });
  return true;
}

async function upsertUser(tx: TxClient, record: Record<string, unknown>, mode: ImportOptions['mode']): Promise<boolean> {
  const existing = await tx.user.findUnique({ where: { id: record.id as string } });

  if (existing && mode === 'skip') return false;

  await tx.user.upsert({
    where: { id: record.id as string },
    update: mode === 'overwrite' ? {
      name: record.name as string | null,
      email: record.email as string | null,
      emailVerified: record.emailVerified ? new Date(record.emailVerified as string) : null,
      image: record.image as string | null,
      birthDate: record.birthDate ? new Date(record.birthDate as string) : null,
    } : {},
    create: {
      id: record.id as string,
      name: record.name as string | null,
      email: record.email as string | null,
      emailVerified: record.emailVerified ? new Date(record.emailVerified as string) : null,
      image: record.image as string | null,
      birthDate: record.birthDate ? new Date(record.birthDate as string) : null,
    },
  });
  return true;
}

async function upsertAccount(tx: TxClient, record: Record<string, unknown>, mode: ImportOptions['mode']): Promise<boolean> {
  const existing = await tx.account.findUnique({
    where: {
      provider_providerAccountId: {
        provider: record.provider as string,
        providerAccountId: record.providerAccountId as string,
      },
    },
  });

  if (existing && mode === 'skip') return false;

  await tx.account.upsert({
    where: {
      provider_providerAccountId: {
        provider: record.provider as string,
        providerAccountId: record.providerAccountId as string,
      },
    },
    update: mode === 'overwrite' ? {
      type: record.type as string,
      refresh_token: record.refresh_token as string | null,
      access_token: record.access_token as string | null,
      expires_at: record.expires_at as number | null,
      token_type: record.token_type as string | null,
      scope: record.scope as string | null,
      id_token: record.id_token as string | null,
      session_state: record.session_state as string | null,
    } : {},
    create: {
      id: record.id as string,
      userId: record.userId as string,
      type: record.type as string,
      provider: record.provider as string,
      providerAccountId: record.providerAccountId as string,
      refresh_token: record.refresh_token as string | null,
      access_token: record.access_token as string | null,
      expires_at: record.expires_at as number | null,
      token_type: record.token_type as string | null,
      scope: record.scope as string | null,
      id_token: record.id_token as string | null,
      session_state: record.session_state as string | null,
    },
  });
  return true;
}

async function upsertSession(tx: TxClient, record: Record<string, unknown>, mode: ImportOptions['mode']): Promise<boolean> {
  const existing = await tx.session.findUnique({ where: { id: record.id as string } });

  if (existing && mode === 'skip') return false;

  await tx.session.upsert({
    where: { id: record.id as string },
    update: mode === 'overwrite' ? {
      sessionToken: record.sessionToken as string,
      expires: new Date(record.expires as string),
    } : {},
    create: {
      id: record.id as string,
      sessionToken: record.sessionToken as string,
      userId: record.userId as string,
      expires: new Date(record.expires as string),
    },
  });
  return true;
}

async function upsertFitData(tx: TxClient, record: Record<string, unknown>, mode: ImportOptions['mode']): Promise<boolean> {
  const existing = await tx.fitData.findUnique({
    where: {
      userId_date: {
        userId: record.userId as string,
        date: new Date(record.date as string),
      },
    },
  });

  if (existing && mode === 'skip') return false;

  await tx.fitData.upsert({
    where: {
      userId_date: {
        userId: record.userId as string,
        date: new Date(record.date as string),
      },
    },
    update: mode === 'overwrite' ? {
      heartRate: record.heartRate as number | null,
      steps: record.steps as number | null,
      weight: record.weight as number | null,
      raw: toJsonValue(record.raw),
      distance: record.distance as number | null,
      calories: record.calories as number | null,
      sleepMinutes: record.sleepMinutes as number | null,
      sleepData: toJsonValue(record.sleepData),
      vitals: toJsonValue(record.vitals),
      workouts: toJsonValue(record.workouts),
      syncedAt: new Date(record.syncedAt as string),
    } : {},
    create: {
      id: record.id as string,
      userId: record.userId as string,
      date: new Date(record.date as string),
      heartRate: record.heartRate as number | null,
      steps: record.steps as number | null,
      weight: record.weight as number | null,
      raw: toJsonValue(record.raw),
      distance: record.distance as number | null,
      calories: record.calories as number | null,
      sleepMinutes: record.sleepMinutes as number | null,
      sleepData: toJsonValue(record.sleepData),
      vitals: toJsonValue(record.vitals),
      workouts: toJsonValue(record.workouts),
      syncedAt: new Date(record.syncedAt as string),
    },
  });
  return true;
}

async function upsertHealthRecord(tx: TxClient, record: Record<string, unknown>, mode: ImportOptions['mode']): Promise<boolean> {
  const existing = await tx.healthRecord.findUnique({ where: { id: record.id as string } });

  if (existing && mode === 'skip') return false;

  await tx.healthRecord.upsert({
    where: { id: record.id as string },
    update: mode === 'overwrite' ? {
      date: new Date(record.date as string),
      status: record.status as string,
      title: record.title as string | null,
      summary: record.summary as string | null,
      data: toJsonValue(record.data) ?? {},
      additional_data: toJsonValue(record.additional_data),
      images: record.images as string[],
    } : {},
    create: {
      id: record.id as string,
      userId: record.userId as string,
      date: new Date(record.date as string),
      status: record.status as string,
      title: record.title as string | null,
      summary: record.summary as string | null,
      data: toJsonValue(record.data) ?? {},
      additional_data: toJsonValue(record.additional_data),
      images: record.images as string[] || [],
    },
  });
  return true;
}

async function upsertUserHealthItemSetting(tx: TxClient, record: Record<string, unknown>, mode: ImportOptions['mode']): Promise<boolean> {
  const existing = await tx.userHealthItemSetting.findUnique({
    where: {
      userId_itemName: {
        userId: record.userId as string,
        itemName: record.itemName as string,
      },
    },
  });

  if (existing && mode === 'skip') return false;

  await tx.userHealthItemSetting.upsert({
    where: {
      userId_itemName: {
        userId: record.userId as string,
        itemName: record.itemName as string,
      },
    },
    update: mode === 'overwrite' ? {
      minVal: record.minVal as number,
      maxVal: record.maxVal as number,
      safeMin: record.safeMin as number | null,
      safeMax: record.safeMax as number | null,
      tags: record.tags as string[],
    } : {},
    create: {
      id: record.id as string,
      userId: record.userId as string,
      itemName: record.itemName as string,
      minVal: record.minVal as number,
      maxVal: record.maxVal as number,
      safeMin: record.safeMin as number | null,
      safeMax: record.safeMax as number | null,
      tags: record.tags as string[] || [],
    },
  });
  return true;
}

async function upsertLifestyleHabit(tx: TxClient, record: Record<string, unknown>, mode: ImportOptions['mode']): Promise<boolean> {
  const existing = await tx.lifestyleHabit.findUnique({
    where: {
      userId_category_name: {
        userId: record.userId as string,
        category: record.category as string,
        name: record.name as string,
      },
    },
  });

  if (existing && mode === 'skip') return false;

  await tx.lifestyleHabit.upsert({
    where: {
      userId_category_name: {
        userId: record.userId as string,
        category: record.category as string,
        name: record.name as string,
      },
    },
    update: mode === 'overwrite' ? {
      value: record.value as object,
    } : {},
    create: {
      id: record.id as string,
      userId: record.userId as string,
      category: record.category as string,
      name: record.name as string,
      value: record.value as object,
    },
  });
  return true;
}

async function upsertSupplement(tx: TxClient, record: Record<string, unknown>, mode: ImportOptions['mode']): Promise<boolean> {
  const existing = await tx.supplement.findUnique({ where: { id: record.id as string } });

  if (existing && mode === 'skip') return false;

  await tx.supplement.upsert({
    where: { id: record.id as string },
    update: mode === 'overwrite' ? {
      name: record.name as string,
      timing: record.timing as string[],
      order: record.order as number,
      amount: record.amount as string,
      unit: record.unit as string,
      manufacturer: record.manufacturer as string | null,
      note: record.note as string | null,
      startDate: record.startDate ? new Date(record.startDate as string) : null,
      pausedPeriods: toJsonValue(record.pausedPeriods),
    } : {},
    create: {
      id: record.id as string,
      userId: record.userId as string,
      name: record.name as string,
      timing: record.timing as string[] || [],
      order: record.order as number || 0,
      amount: record.amount as string,
      unit: record.unit as string,
      manufacturer: record.manufacturer as string | null,
      note: record.note as string | null,
      startDate: record.startDate ? new Date(record.startDate as string) : null,
      pausedPeriods: toJsonValue(record.pausedPeriods),
    },
  });
  return true;
}

async function upsertInspectionItem(tx: TxClient, record: Record<string, unknown>, mode: ImportOptions['mode']): Promise<boolean> {
  const existing = await tx.inspectionItem.findUnique({
    where: {
      userId_name: {
        userId: record.userId as string,
        name: record.name as string,
      },
    },
  });

  if (existing && mode === 'skip') return false;

  await tx.inspectionItem.upsert({
    where: {
      userId_name: {
        userId: record.userId as string,
        name: record.name as string,
      },
    },
    update: mode === 'overwrite' ? {
      masterItemCode: record.masterItemCode as string | null,
    } : {},
    create: {
      id: record.id as string,
      userId: record.userId as string,
      name: record.name as string,
      masterItemCode: record.masterItemCode as string | null,
    },
  });
  return true;
}

async function upsertInspectionItemAlias(tx: TxClient, record: Record<string, unknown>, mode: ImportOptions['mode']): Promise<boolean> {
  const existing = await tx.inspectionItemAlias.findUnique({
    where: {
      inspectionItemId_originalName: {
        inspectionItemId: record.inspectionItemId as string,
        originalName: record.originalName as string,
      },
    },
  });

  if (existing && mode === 'skip') return false;

  await tx.inspectionItemAlias.upsert({
    where: {
      inspectionItemId_originalName: {
        inspectionItemId: record.inspectionItemId as string,
        originalName: record.originalName as string,
      },
    },
    update: {},
    create: {
      id: record.id as string,
      inspectionItemId: record.inspectionItemId as string,
      originalName: record.originalName as string,
    },
  });
  return true;
}

async function upsertInspectionItemHistory(tx: TxClient, record: Record<string, unknown>, mode: ImportOptions['mode']): Promise<boolean> {
  const existing = await tx.inspectionItemHistory.findUnique({ where: { id: record.id as string } });

  if (existing && mode === 'skip') return false;

  await tx.inspectionItemHistory.upsert({
    where: { id: record.id as string },
    update: mode === 'overwrite' ? {
      operationType: record.operationType as string,
      details: record.details as object,
      undoCommand: record.undoCommand as string,
    } : {},
    create: {
      id: record.id as string,
      inspectionItemId: record.inspectionItemId as string,
      operationType: record.operationType as string,
      details: record.details as object,
      undoCommand: record.undoCommand as string,
    },
  });
  return true;
}
