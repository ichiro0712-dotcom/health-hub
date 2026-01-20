/**
 * データベースエクスポート機能
 */

import prisma from '@/lib/prisma';
import {
  BackupFile,
  BackupData,
  BackupMetadata,
  ExportOptions,
  TABLE_NAMES,
  BACKUP_VERSION,
  TableName,
} from './types';

/**
 * 全データまたは指定テーブルのデータをエクスポート
 */
export async function exportDatabase(options: ExportOptions = {}): Promise<BackupFile> {
  const { tables, userId } = options;
  const targetTables = tables || [...TABLE_NAMES];

  const data: BackupData = {};
  const recordCounts: Record<string, number> = {};

  // 各テーブルのデータを取得
  for (const table of targetTables) {
    const tableData = await exportTable(table as TableName, userId);
    if (tableData.length > 0) {
      (data as Record<string, unknown[]>)[table] = tableData;
      recordCounts[table] = tableData.length;
    }
  }

  // メタデータを作成
  const metadata: BackupMetadata = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: process.env.npm_package_version || '1.0.0',
    tables: Object.keys(data),
    userId: userId,
    recordCounts,
  };

  return { metadata, data };
}

/**
 * 個別テーブルのエクスポート
 */
async function exportTable(table: TableName, userId?: string): Promise<unknown[]> {
  const whereClause = userId ? { userId } : {};

  switch (table) {
    case 'MasterItem':
      // MasterItemはuserIdを持たないので全件取得
      return await prisma.masterItem.findMany();

    case 'User':
      if (userId) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        return user ? [serializeUser(user)] : [];
      }
      const users = await prisma.user.findMany();
      return users.map(serializeUser);

    case 'Account':
      const accounts = await prisma.account.findMany({ where: whereClause });
      return accounts;

    case 'Session':
      const sessions = await prisma.session.findMany({ where: whereClause });
      return sessions.map(s => ({
        ...s,
        expires: s.expires.toISOString(),
      }));

    case 'FitData':
      const fitData = await prisma.fitData.findMany({ where: whereClause });
      return fitData.map(f => ({
        ...f,
        date: f.date.toISOString(),
        syncedAt: f.syncedAt.toISOString(),
      }));

    case 'HealthRecord':
      const healthRecords = await prisma.healthRecord.findMany({ where: whereClause });
      return healthRecords.map(h => ({
        ...h,
        date: h.date.toISOString(),
        createdAt: h.createdAt.toISOString(),
        updatedAt: h.updatedAt.toISOString(),
      }));

    case 'UserHealthItemSetting':
      const settings = await prisma.userHealthItemSetting.findMany({ where: whereClause });
      return settings.map(s => ({
        ...s,
        updatedAt: s.updatedAt.toISOString(),
      }));

    case 'LifestyleHabit':
      const habits = await prisma.lifestyleHabit.findMany({ where: whereClause });
      return habits.map(h => ({
        ...h,
        createdAt: h.createdAt.toISOString(),
        updatedAt: h.updatedAt.toISOString(),
      }));

    case 'Supplement':
      const supplements = await prisma.supplement.findMany({ where: whereClause });
      return supplements.map(s => ({
        ...s,
        startDate: s.startDate?.toISOString() || null,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      }));

    case 'InspectionItem':
      const items = await prisma.inspectionItem.findMany({ where: whereClause });
      return items.map(i => ({
        ...i,
        createdAt: i.createdAt.toISOString(),
        updatedAt: i.updatedAt.toISOString(),
      }));

    case 'InspectionItemAlias':
      // ユーザー単位の場合、InspectionItem経由でフィルタ
      if (userId) {
        const userItems = await prisma.inspectionItem.findMany({
          where: { userId },
          select: { id: true },
        });
        const itemIds = userItems.map(i => i.id);
        return await prisma.inspectionItemAlias.findMany({
          where: { inspectionItemId: { in: itemIds } },
        });
      }
      return await prisma.inspectionItemAlias.findMany();

    case 'InspectionItemHistory':
      // ユーザー単位の場合、InspectionItem経由でフィルタ
      if (userId) {
        const userItems = await prisma.inspectionItem.findMany({
          where: { userId },
          select: { id: true },
        });
        const itemIds = userItems.map(i => i.id);
        const histories = await prisma.inspectionItemHistory.findMany({
          where: { inspectionItemId: { in: itemIds } },
        });
        return histories.map(h => ({
          ...h,
          createdAt: h.createdAt.toISOString(),
        }));
      }
      const allHistories = await prisma.inspectionItemHistory.findMany();
      return allHistories.map(h => ({
        ...h,
        createdAt: h.createdAt.toISOString(),
      }));

    default:
      return [];
  }
}

/**
 * Userオブジェクトのシリアライズ
 */
function serializeUser(user: {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: Date | null;
  image: string | null;
  birthDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified?.toISOString() || null,
    image: user.image,
    birthDate: user.birthDate?.toISOString() || null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

/**
 * バックアップをJSONファイルとして生成
 */
export function generateBackupFileName(userId?: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const userPart = userId ? `_user-${userId.slice(0, 8)}` : '';
  return `health-hub-backup_${timestamp}${userPart}.json`;
}

/**
 * テーブル単位でのレコード数を取得 (プレビュー用)
 */
export async function getTableCounts(userId?: string): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};

  const whereClause = userId ? { userId } : {};

  counts.MasterItem = await prisma.masterItem.count();
  counts.User = userId ? 1 : await prisma.user.count();
  counts.Account = await prisma.account.count(userId ? { where: whereClause } : undefined);
  counts.Session = await prisma.session.count(userId ? { where: whereClause } : undefined);
  counts.FitData = await prisma.fitData.count(userId ? { where: whereClause } : undefined);
  counts.HealthRecord = await prisma.healthRecord.count(userId ? { where: whereClause } : undefined);
  counts.UserHealthItemSetting = await prisma.userHealthItemSetting.count(userId ? { where: whereClause } : undefined);
  counts.LifestyleHabit = await prisma.lifestyleHabit.count(userId ? { where: whereClause } : undefined);
  counts.Supplement = await prisma.supplement.count(userId ? { where: whereClause } : undefined);
  counts.InspectionItem = await prisma.inspectionItem.count(userId ? { where: whereClause } : undefined);

  if (userId) {
    const userItems = await prisma.inspectionItem.findMany({
      where: { userId },
      select: { id: true },
    });
    const itemIds = userItems.map(i => i.id);
    counts.InspectionItemAlias = await prisma.inspectionItemAlias.count({
      where: { inspectionItemId: { in: itemIds } },
    });
    counts.InspectionItemHistory = await prisma.inspectionItemHistory.count({
      where: { inspectionItemId: { in: itemIds } },
    });
  } else {
    counts.InspectionItemAlias = await prisma.inspectionItemAlias.count();
    counts.InspectionItemHistory = await prisma.inspectionItemHistory.count();
  }

  return counts;
}
