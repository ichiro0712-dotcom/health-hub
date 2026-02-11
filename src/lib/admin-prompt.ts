import prisma from '@/lib/prisma';

/**
 * DBからプロンプトを取得。存在しなければデフォルト値を返す。
 */
export async function getAdminPrompt(key: string, defaultValue: string): Promise<string> {
  try {
    const record = await prisma.adminPrompt.findUnique({
      where: { key },
    });
    if (record && record.isActive) {
      return record.value;
    }
  } catch (e) {
    console.error(`[AdminPrompt] Failed to fetch key="${key}":`, e);
  }
  return defaultValue;
}

/**
 * JSON形式の設定値を取得
 */
export async function getAdminConfig<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const record = await prisma.adminPrompt.findUnique({
      where: { key },
    });
    if (record && record.isActive) {
      return JSON.parse(record.value) as T;
    }
  } catch (e) {
    console.error(`[AdminConfig] Failed to fetch key="${key}":`, e);
  }
  return defaultValue;
}

/**
 * 数値の設定値を取得
 */
export async function getAdminNumber(key: string, defaultValue: number): Promise<number> {
  try {
    const record = await prisma.adminPrompt.findUnique({
      where: { key },
    });
    if (record && record.isActive) {
      const parsed = parseFloat(record.value);
      if (!isNaN(parsed)) return parsed;
    }
  } catch (e) {
    console.error(`[AdminNumber] Failed to fetch key="${key}":`, e);
  }
  return defaultValue;
}
