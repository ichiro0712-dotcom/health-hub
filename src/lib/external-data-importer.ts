// 外部データ取り込みロジック

import prisma from '@/lib/prisma';
import {
  HEALTH_RECORD_MAPPING,
  HEALTH_RECORD_ITEM_MAPPING,
  FIT_DATA_MAPPING,
  DETAILED_SLEEP_MAPPING,
  HRV_DATA_MAPPING,
  QUESTION_TO_SECTION,
  type DataFieldMapping,
  type ExternalDataSource,
} from '@/constants/external-data-mapping';
import { HEALTH_QUESTIONS } from '@/constants/health-questions';
import { DEFAULT_PROFILE_CATEGORIES } from '@/constants/health-profile';

// 抽出された外部データ項目
export interface ExtractedDataItem {
  source: ExternalDataSource;
  field: string;
  value: string;
  rawValue: unknown;
  questionId: string | null;
  sectionId: string;
  evaluation?: string;  // 健康診断の評価（正常、要注意など）
}

// 外部データプレビュー
export interface ExternalDataPreview {
  hasNewData: boolean;
  lastChecked?: Date;
  available: {
    healthRecord?: {
      hasNew: boolean;
      latestDate: string;
      title?: string;
      items: ExtractedDataItem[];
      texts: { type: string; content: string }[];
    };
    fitData?: {
      hasNew: boolean;
      period: string;
      items: ExtractedDataItem[];
    };
    detailedSleep?: {
      hasNew: boolean;
      period: string;
      items: ExtractedDataItem[];
    };
    hrvData?: {
      hasNew: boolean;
      period: string;
      items: ExtractedDataItem[];
    };
    supplement?: {
      hasNew: boolean;
      items: ExtractedDataItem[];
    };
  };
}

// HealthRecord から結果を解析
interface HealthCheckResult {
  item?: string;
  name?: string;
  value?: string | number;
  unit?: string;
  evaluation?: string;
  isAbnormal?: boolean;
  referenceRange?: string;
}

interface HealthRecordData {
  results?: HealthCheckResult[];
  meta?: {
    findings?: string;
    notes?: string;
    sections?: { title?: string; content?: string }[];
    hospitalName?: string;
  };
  [key: string]: unknown;
}

// 健康診断データから情報を抽出
function extractFromHealthRecord(
  record: { date: Date; title?: string | null; summary?: string | null; data: unknown },
  lastImportedAt?: Date | null
): { items: ExtractedDataItem[]; texts: { type: string; content: string }[] } {
  const items: ExtractedDataItem[] = [];
  const texts: { type: string; content: string }[] = [];

  const data = record.data as HealthRecordData;
  if (!data) return { items, texts };

  // results 配列から検査項目を抽出
  if (data.results && Array.isArray(data.results)) {
    for (const result of data.results) {
      const itemName = result.item || result.name;
      if (!itemName || result.value === undefined || result.value === null) continue;

      // マッピングを検索
      const mapping = HEALTH_RECORD_ITEM_MAPPING[itemName];
      if (mapping && mapping.questionId) {
        const formattedValue = mapping.format
          ? mapping.format(result.value)
          : `${result.value}${result.unit || ''}`;

        items.push({
          source: 'healthRecord',
          field: mapping.field,
          value: formattedValue,
          rawValue: result.value,
          questionId: mapping.questionId,
          sectionId: QUESTION_TO_SECTION[mapping.questionId] || 'medical_history',
          evaluation: result.evaluation,
        });
      }
    }
  }

  // トップレベルのフィールドを確認
  for (const [key, mapping] of Object.entries(HEALTH_RECORD_MAPPING)) {
    if (key in data && data[key] !== undefined && data[key] !== null) {
      if (mapping.type === 'number' && mapping.questionId) {
        const formattedValue = mapping.format
          ? mapping.format(data[key])
          : String(data[key]);

        // 重複チェック
        const alreadyAdded = items.some(
          item => item.questionId === mapping.questionId && item.field === mapping.field
        );
        if (!alreadyAdded) {
          items.push({
            source: 'healthRecord',
            field: mapping.field,
            value: formattedValue,
            rawValue: data[key],
            questionId: mapping.questionId,
            sectionId: QUESTION_TO_SECTION[mapping.questionId] || 'medical_history',
          });
        }
      }
    }
  }

  // テキストデータ（所見、メモ、セクション）
  if (data.meta?.findings) {
    texts.push({ type: 'findings', content: data.meta.findings });
  }
  if (data.meta?.notes) {
    texts.push({ type: 'notes', content: data.meta.notes });
  }
  if (data.meta?.sections && Array.isArray(data.meta.sections)) {
    for (const section of data.meta.sections) {
      if (section.content) {
        texts.push({
          type: 'section',
          content: section.title ? `【${section.title}】\n${section.content}` : section.content,
        });
      }
    }
  }

  // summary も取り込み
  if (record.summary) {
    texts.push({ type: 'summary', content: record.summary });
  }

  return { items, texts };
}

// FitData から情報を抽出（直近N日の平均）
function extractFromFitData(
  fitDataList: Array<{
    date: Date;
    heartRate: number | null;
    steps: number | null;
    weight: number | null;
    sleepMinutes: number | null;
    calories: number | null;
    distance: number | null;
  }>
): ExtractedDataItem[] {
  const items: ExtractedDataItem[] = [];
  if (fitDataList.length === 0) return items;

  // 各フィールドの平均を計算
  const avgValues: { [key: string]: number } = {};
  const counts: { [key: string]: number } = {};

  for (const fit of fitDataList) {
    for (const [key, mapping] of Object.entries(FIT_DATA_MAPPING)) {
      const value = fit[key as keyof typeof fit];
      if (value !== null && value !== undefined && typeof value === 'number') {
        avgValues[key] = (avgValues[key] || 0) + value;
        counts[key] = (counts[key] || 0) + 1;
      }
    }
  }

  // 平均値からアイテムを作成
  for (const [key, totalValue] of Object.entries(avgValues)) {
    const count = counts[key];
    if (count > 0) {
      const avgValue = totalValue / count;
      const mapping = FIT_DATA_MAPPING[key];
      if (mapping) {
        const formattedValue = mapping.format
          ? mapping.format(avgValue)
          : String(Math.round(avgValue));

        items.push({
          source: 'fitData',
          field: mapping.field,
          value: formattedValue,
          rawValue: avgValue,
          questionId: mapping.questionId,
          sectionId: mapping.questionId
            ? QUESTION_TO_SECTION[mapping.questionId] || 'basic_attributes'
            : mapping.target || 'basic_attributes',
        });
      }
    }
  }

  return items;
}

// DetailedSleep から情報を抽出
function extractFromDetailedSleep(
  sleepList: Array<{
    date: Date;
    duration: number;
    efficiency: number;
    minutesDeep: number;
    minutesRem: number;
  }>
): ExtractedDataItem[] {
  const items: ExtractedDataItem[] = [];
  if (sleepList.length === 0) return items;

  // 平均を計算
  const avgDuration = sleepList.reduce((sum, s) => sum + s.duration, 0) / sleepList.length;
  const avgEfficiency = sleepList.reduce((sum, s) => sum + s.efficiency, 0) / sleepList.length;
  const avgDeep = sleepList.reduce((sum, s) => sum + s.minutesDeep, 0) / sleepList.length;
  const avgRem = sleepList.reduce((sum, s) => sum + s.minutesRem, 0) / sleepList.length;

  const values = { duration: avgDuration, efficiency: avgEfficiency, minutesDeep: avgDeep, minutesRem: avgRem };

  for (const [key, value] of Object.entries(values)) {
    const mapping = DETAILED_SLEEP_MAPPING[key];
    if (mapping) {
      const formattedValue = mapping.format ? mapping.format(value) : String(Math.round(value));
      items.push({
        source: 'detailedSleep',
        field: mapping.field,
        value: formattedValue,
        rawValue: value,
        questionId: mapping.questionId,
        sectionId: mapping.questionId ? QUESTION_TO_SECTION[mapping.questionId] || 'circadian' : 'circadian',
      });
    }
  }

  return items;
}

// HrvData から情報を抽出
function extractFromHrvData(
  hrvList: Array<{ date: Date; dailyRmssd: number }>
): ExtractedDataItem[] {
  const items: ExtractedDataItem[] = [];
  if (hrvList.length === 0) return items;

  const avgRmssd = hrvList.reduce((sum, h) => sum + h.dailyRmssd, 0) / hrvList.length;
  const mapping = HRV_DATA_MAPPING['dailyRmssd'];
  if (mapping) {
    items.push({
      source: 'hrvData',
      field: mapping.field,
      value: mapping.format ? mapping.format(avgRmssd) : String(Math.round(avgRmssd)),
      rawValue: avgRmssd,
      questionId: mapping.questionId,
      sectionId: mapping.target || 'physiology',
    });
  }

  return items;
}

// サプリメント情報を抽出
function extractFromSupplements(
  supplements: Array<{ name: string; amount: string; unit: string; timing: string[] }>
): ExtractedDataItem[] {
  if (supplements.length === 0) return [];

  const supplementList = supplements
    .map(s => `${s.name} ${s.amount}${s.unit} (${s.timing.join(', ')})`)
    .join('\n');

  return [{
    source: 'supplement',
    field: 'サプリメント一覧',
    value: supplementList,
    rawValue: supplements,
    questionId: '7-2',
    sectionId: 'substances',
  }];
}

// 外部データのプレビューを取得
export async function getExternalDataPreview(
  userId: string,
  lastImportedAt?: Date | null
): Promise<ExternalDataPreview> {
  const preview: ExternalDataPreview = {
    hasNewData: false,
    available: {},
  };

  // 健康診断データ（最新1件）
  const latestHealthRecord = await prisma.healthRecord.findFirst({
    where: { userId },
    orderBy: { date: 'desc' },
  });

  if (latestHealthRecord) {
    const isNew = !lastImportedAt || latestHealthRecord.updatedAt > lastImportedAt;
    const { items, texts } = extractFromHealthRecord(latestHealthRecord, lastImportedAt);

    if (items.length > 0 || texts.length > 0) {
      preview.available.healthRecord = {
        hasNew: isNew,
        latestDate: latestHealthRecord.date.toISOString().split('T')[0],
        title: latestHealthRecord.title || undefined,
        items,
        texts,
      };
      if (isNew) preview.hasNewData = true;
    }
  }

  // FitData（直近7日間）
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const fitDataList = await prisma.fitData.findMany({
    where: {
      userId,
      date: { gte: sevenDaysAgo },
    },
    orderBy: { date: 'desc' },
  });

  if (fitDataList.length > 0) {
    const isNew = !lastImportedAt || fitDataList.some(f => f.syncedAt > lastImportedAt);
    const items = extractFromFitData(fitDataList);

    if (items.length > 0) {
      const startDate = fitDataList[fitDataList.length - 1].date.toISOString().split('T')[0];
      const endDate = fitDataList[0].date.toISOString().split('T')[0];
      preview.available.fitData = {
        hasNew: isNew,
        period: `${startDate} 〜 ${endDate}`,
        items,
      };
      if (isNew) preview.hasNewData = true;
    }
  }

  // DetailedSleep（直近7日間）
  const sleepList = await prisma.detailedSleep.findMany({
    where: {
      userId,
      date: { gte: sevenDaysAgo },
    },
    orderBy: { date: 'desc' },
  });

  if (sleepList.length > 0) {
    const isNew = !lastImportedAt || sleepList.some(s => s.syncedAt > lastImportedAt);
    const items = extractFromDetailedSleep(sleepList);

    if (items.length > 0) {
      const startDate = sleepList[sleepList.length - 1].date.toISOString().split('T')[0];
      const endDate = sleepList[0].date.toISOString().split('T')[0];
      preview.available.detailedSleep = {
        hasNew: isNew,
        period: `${startDate} 〜 ${endDate}`,
        items,
      };
      if (isNew) preview.hasNewData = true;
    }
  }

  // HrvData（直近7日間）
  const hrvList = await prisma.hrvData.findMany({
    where: {
      userId,
      date: { gte: sevenDaysAgo },
    },
    orderBy: { date: 'desc' },
  });

  if (hrvList.length > 0) {
    const isNew = !lastImportedAt || hrvList.some(h => h.syncedAt > lastImportedAt);
    const items = extractFromHrvData(hrvList);

    if (items.length > 0) {
      const startDate = hrvList[hrvList.length - 1].date.toISOString().split('T')[0];
      const endDate = hrvList[0].date.toISOString().split('T')[0];
      preview.available.hrvData = {
        hasNew: isNew,
        period: `${startDate} 〜 ${endDate}`,
        items,
      };
      if (isNew) preview.hasNewData = true;
    }
  }

  // Supplement
  const supplements = await prisma.supplement.findMany({
    where: { userId },
    orderBy: { order: 'asc' },
  });

  if (supplements.length > 0) {
    const isNew = !lastImportedAt || supplements.some(s => s.updatedAt > lastImportedAt);
    const items = extractFromSupplements(supplements);

    if (items.length > 0) {
      preview.available.supplement = {
        hasNew: isNew,
        items,
      };
      if (isNew) preview.hasNewData = true;
    }
  }

  return preview;
}

// 外部データを健康プロフィールに取り込む
export async function importExternalData(
  userId: string,
  sources: ExternalDataSource[],
  sessionId?: string
): Promise<{
  questionsAnswered: { questionId: string; source: string; value: string }[];
  profileUpdates: { sectionId: string; addedText: string }[];
  summary: string;
}> {
  const preview = await getExternalDataPreview(userId);
  const questionsAnswered: { questionId: string; source: string; value: string }[] = [];
  const profileUpdates: Map<string, string[]> = new Map();

  // 各ソースからデータを取り込む
  for (const source of sources) {
    let items: ExtractedDataItem[] = [];
    let texts: { type: string; content: string }[] = [];

    switch (source) {
      case 'healthRecord':
        if (preview.available.healthRecord) {
          items = preview.available.healthRecord.items;
          texts = preview.available.healthRecord.texts;
        }
        break;
      case 'fitData':
        if (preview.available.fitData) {
          items = preview.available.fitData.items;
        }
        break;
      case 'detailedSleep':
        if (preview.available.detailedSleep) {
          items = preview.available.detailedSleep.items;
        }
        break;
      case 'hrvData':
        if (preview.available.hrvData) {
          items = preview.available.hrvData.items;
        }
        break;
      case 'supplement':
        if (preview.available.supplement) {
          items = preview.available.supplement.items;
        }
        break;
    }

    // 数値データを処理
    for (const item of items) {
      if (item.questionId) {
        // 質問を回答済みにマーク
        const question = HEALTH_QUESTIONS.find(q => q.id === item.questionId);
        if (question) {
          await prisma.healthQuestionProgress.upsert({
            where: { userId_questionId: { userId, questionId: item.questionId } },
            create: {
              userId,
              questionId: item.questionId,
              sectionId: question.sectionId,
              priority: question.priority,
              isAnswered: true,
              answerSummary: `${item.field}: ${item.value}${item.evaluation ? ` (${item.evaluation})` : ''}`,
            },
            update: {
              isAnswered: true,
              answerSummary: `${item.field}: ${item.value}${item.evaluation ? ` (${item.evaluation})` : ''}`,
            },
          });

          questionsAnswered.push({
            questionId: item.questionId,
            source: source,
            value: `${item.field}: ${item.value}`,
          });
        }
      }

      // プロフィールに追記
      const sectionId = item.sectionId;
      const textToAdd = `・${item.field}: ${item.value}${item.evaluation ? ` (${item.evaluation})` : ''}`;
      const existing = profileUpdates.get(sectionId) || [];
      existing.push(textToAdd);
      profileUpdates.set(sectionId, existing);
    }

    // テキストデータを処理（健康診断の所見など）
    if (source === 'healthRecord' && texts.length > 0) {
      const sectionId = 'medical_history';
      const date = preview.available.healthRecord?.latestDate || new Date().toISOString().split('T')[0];
      const textHeader = `\n【${date} 健診より】`;
      const textContent = texts.map(t => t.content).join('\n');

      const existing = profileUpdates.get(sectionId) || [];
      existing.push(textHeader + '\n' + textContent);
      profileUpdates.set(sectionId, existing);
    }
  }

  // プロフィールセクションを更新
  const profileUpdateResults: { sectionId: string; addedText: string }[] = [];

  for (const [sectionId, textLines] of profileUpdates) {
    const addedText = textLines.join('\n');
    const category = DEFAULT_PROFILE_CATEGORIES.find(c => c.id === sectionId);

    const existingSection = await prisma.healthProfileSection.findUnique({
      where: { userId_categoryId: { userId, categoryId: sectionId } },
    });

    const newContent = existingSection?.content
      ? `${existingSection.content}\n\n${addedText}`
      : addedText;

    await prisma.healthProfileSection.upsert({
      where: { userId_categoryId: { userId, categoryId: sectionId } },
      create: {
        userId,
        categoryId: sectionId,
        title: category?.title || sectionId,
        content: newContent,
        orderIndex: category?.order || 0,
      },
      update: {
        content: newContent,
      },
    });

    profileUpdateResults.push({ sectionId, addedText });
  }

  const summary = questionsAnswered.length > 0
    ? `${questionsAnswered.length}件の質問に自動回答し、${profileUpdateResults.length}つのセクションを更新しました`
    : 'データの取り込みが完了しました';

  return {
    questionsAnswered,
    profileUpdates: profileUpdateResults,
    summary,
  };
}
