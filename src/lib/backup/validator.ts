/**
 * バックアップファイルのバリデーション
 */

import {
  BackupFile,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  TABLE_NAMES,
  BACKUP_VERSION,
  TableName,
} from './types';

/**
 * バックアップファイルの構造とデータを検証
 */
export function validateBackupFile(backup: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // 基本構造チェック
  if (!backup || typeof backup !== 'object') {
    errors.push({
      table: 'root',
      message: 'バックアップファイルが無効なJSON形式です',
    });
    return { valid: false, errors, warnings };
  }

  const file = backup as Record<string, unknown>;

  // メタデータチェック
  if (!file.metadata || typeof file.metadata !== 'object') {
    errors.push({
      table: 'metadata',
      message: 'メタデータが見つかりません',
    });
  } else {
    validateMetadata(file.metadata as Record<string, unknown>, errors, warnings);
  }

  // データチェック
  if (!file.data || typeof file.data !== 'object') {
    errors.push({
      table: 'data',
      message: 'データセクションが見つかりません',
    });
  } else {
    validateData(file.data as Record<string, unknown>, errors, warnings);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * メタデータの検証
 */
function validateMetadata(
  metadata: Record<string, unknown>,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  // バージョンチェック
  if (!metadata.version) {
    errors.push({
      table: 'metadata',
      field: 'version',
      message: 'バージョン情報がありません',
    });
  } else if (metadata.version !== BACKUP_VERSION) {
    warnings.push({
      table: 'metadata',
      message: `バックアップバージョン(${metadata.version})が現在のバージョン(${BACKUP_VERSION})と異なります`,
    });
  }

  // エクスポート日時チェック
  if (!metadata.exportedAt) {
    warnings.push({
      table: 'metadata',
      message: 'エクスポート日時がありません',
    });
  } else {
    const date = new Date(metadata.exportedAt as string);
    if (isNaN(date.getTime())) {
      errors.push({
        table: 'metadata',
        field: 'exportedAt',
        message: 'エクスポート日時の形式が無効です',
      });
    }
  }

  // テーブルリストチェック
  if (!Array.isArray(metadata.tables)) {
    warnings.push({
      table: 'metadata',
      message: 'テーブルリストがありません',
    });
  }
}

/**
 * データセクションの検証
 */
function validateData(
  data: Record<string, unknown>,
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  const tableNames = Object.keys(data);

  // 不明なテーブルのチェック
  for (const tableName of tableNames) {
    if (!TABLE_NAMES.includes(tableName as TableName)) {
      warnings.push({
        table: tableName,
        message: `不明なテーブル "${tableName}" が含まれています（スキップされます）`,
      });
      continue;
    }

    const tableData = data[tableName];
    if (!Array.isArray(tableData)) {
      errors.push({
        table: tableName,
        message: `テーブル "${tableName}" のデータが配列ではありません`,
      });
      continue;
    }

    // 各テーブルの個別検証
    validateTableData(tableName as TableName, tableData, errors, warnings);
  }
}

/**
 * テーブル固有のデータ検証
 */
function validateTableData(
  table: TableName,
  data: unknown[],
  errors: ValidationError[],
  warnings: ValidationWarning[]
): void {
  const requiredFields = getRequiredFields(table);

  for (let i = 0; i < data.length; i++) {
    const record = data[i] as Record<string, unknown>;

    if (!record || typeof record !== 'object') {
      errors.push({
        table,
        message: `レコード ${i} が無効なオブジェクトです`,
      });
      continue;
    }

    // 必須フィールドチェック
    for (const field of requiredFields) {
      if (!(field in record)) {
        errors.push({
          table,
          recordId: record.id as string,
          message: `必須フィールド "${field}" がレコード ${i} に存在しません`,
        });
      }
    }

    // IDチェック
    if (!record.id && table !== 'MasterItem') {
      errors.push({
        table,
        message: `レコード ${i} にIDがありません`,
      });
    }
  }

  // 空のテーブル警告
  if (data.length === 0) {
    warnings.push({
      table,
      message: `テーブル "${table}" にデータがありません`,
    });
  }
}

/**
 * テーブルごとの必須フィールドを取得
 */
function getRequiredFields(table: TableName): string[] {
  switch (table) {
    case 'MasterItem':
      return ['code', 'standardName'];
    case 'User':
      return ['id'];
    case 'Account':
      return ['id', 'userId', 'type', 'provider', 'providerAccountId'];
    case 'Session':
      return ['id', 'sessionToken', 'userId', 'expires'];
    case 'FitData':
      return ['id', 'userId', 'date'];
    case 'HealthRecord':
      return ['id', 'userId', 'data'];
    case 'UserHealthItemSetting':
      return ['id', 'userId', 'itemName'];
    case 'LifestyleHabit':
      return ['id', 'userId', 'category', 'name', 'value'];
    case 'Supplement':
      return ['id', 'userId', 'name', 'timing', 'amount', 'unit'];
    case 'InspectionItem':
      return ['id', 'userId', 'name'];
    case 'InspectionItemAlias':
      return ['id', 'inspectionItemId', 'originalName'];
    case 'InspectionItemHistory':
      return ['id', 'inspectionItemId', 'operationType', 'details', 'undoCommand'];
    default:
      return ['id'];
  }
}

/**
 * 外部キー参照の整合性チェック
 */
export function validateReferences(backup: BackupFile): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const data = backup.data;

  // Userへの参照チェック
  const userIds = new Set((data.User || []).map(u => u.id));

  // Account → User
  (data.Account || []).forEach(a => {
    if (!userIds.has(a.userId)) {
      errors.push({
        table: 'Account',
        recordId: a.id,
        message: `参照先User "${a.userId}" が存在しません`,
      });
    }
  });

  // Session → User
  (data.Session || []).forEach(s => {
    if (!userIds.has(s.userId)) {
      errors.push({
        table: 'Session',
        recordId: s.id,
        message: `参照先User "${s.userId}" が存在しません`,
      });
    }
  });

  // FitData → User
  (data.FitData || []).forEach(f => {
    if (!userIds.has(f.userId)) {
      errors.push({
        table: 'FitData',
        recordId: f.id,
        message: `参照先User "${f.userId}" が存在しません`,
      });
    }
  });

  // InspectionItem → MasterItem
  const masterCodes = new Set((data.MasterItem || []).map(m => m.code));
  (data.InspectionItem || []).forEach(i => {
    if (i.masterItemCode && !masterCodes.has(i.masterItemCode)) {
      warnings.push({
        table: 'InspectionItem',
        message: `参照先MasterItem "${i.masterItemCode}" が存在しません (レコード: ${i.id})`,
      });
    }
  });

  // InspectionItemAlias → InspectionItem
  const itemIds = new Set((data.InspectionItem || []).map(i => i.id));
  (data.InspectionItemAlias || []).forEach(a => {
    if (!itemIds.has(a.inspectionItemId)) {
      errors.push({
        table: 'InspectionItemAlias',
        recordId: a.id,
        message: `参照先InspectionItem "${a.inspectionItemId}" が存在しません`,
      });
    }
  });

  // InspectionItemHistory → InspectionItem
  (data.InspectionItemHistory || []).forEach(h => {
    if (!itemIds.has(h.inspectionItemId)) {
      errors.push({
        table: 'InspectionItemHistory',
        recordId: h.id,
        message: `参照先InspectionItem "${h.inspectionItemId}" が存在しません`,
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
