import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';

/**
 * Google Docsに挿入するテキストをサニタイズ
 * 制御文字やフォーマット破壊文字を除去
 */
function sanitizeForGoogleDocs(text: string | null | undefined): string {
    if (!text) return '';
    return text
        // 制御文字を除去（改行とタブは保持）
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        // 特殊なUnicode文字を正規化
        .normalize('NFC')
        // 長すぎる行を防ぐ（Google Docsの制限）
        .split('\n')
        .map(line => line.length > 10000 ? line.substring(0, 10000) + '...' : line)
        .join('\n')
        .trim();
}

// Document IDs
const RECORDS_DOC_ID = '1qCYtdo40Adk_-cG8vcwPkwlPW6NKHq97zeIX-EB0F3Y';
const HEALTH_PROFILE_DOC_ID = '1sHZtZpcFE3Gv8IT8AZZftk3xnCCOUcVwfkC9NuzRanA';

// Initialize Google Docs API client
function getDocsClient() {
    let auth;

    // 本番環境: 環境変数から認証情報を読み込む
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
        auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/documents'],
        });
    } else {
        // ローカル開発: ファイルから認証情報を読み込む
        const keyFilePath = path.join(process.cwd(), 'google-service-account.json');

        if (!fs.existsSync(keyFilePath)) {
            throw new Error('Google service account key file not found. Set GOOGLE_SERVICE_ACCOUNT_JSON env var for production.');
        }

        auth = new google.auth.GoogleAuth({
            keyFile: keyFilePath,
            scopes: ['https://www.googleapis.com/auth/documents'],
        });
    }

    return google.docs({ version: 'v1', auth });
}

// Clear all content from a document
async function clearDocument(docs: ReturnType<typeof google.docs>, documentId: string) {
    // Get document to find the end index
    const doc = await docs.documents.get({ documentId });
    const content = doc.data.body?.content;

    if (!content || content.length <= 1) {
        return; // Document is already empty
    }

    // Find the last element's end index
    const lastElement = content[content.length - 1];
    const endIndex = lastElement.endIndex ? lastElement.endIndex - 1 : 1;

    if (endIndex > 1) {
        await docs.documents.batchUpdate({
            documentId,
            requestBody: {
                requests: [
                    {
                        deleteContentRange: {
                            range: {
                                startIndex: 1,
                                endIndex: endIndex,
                            },
                        },
                    },
                ],
            },
        });
    }
}

// Insert text into a document
async function insertText(docs: ReturnType<typeof google.docs>, documentId: string, text: string) {
    await docs.documents.batchUpdate({
        documentId,
        requestBody: {
            requests: [
                {
                    insertText: {
                        location: { index: 1 },
                        text: text,
                    },
                },
            ],
        },
    });
}

// Format date as yyyy/MM/dd
function formatDate(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
}

// Format datetime as yyyy/MM/dd HH:mm
function formatDateTime(date: Date): string {
    const d = new Date(date);
    const datePart = formatDate(d);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${datePart} ${hours}:${minutes}`;
}

// Format a single record (same format as RecordsCopyButton)
function formatRecordText(record: {
    date: Date;
    title: string | null;
    summary: string | null;
    data: any;
    additional_data?: any;
}): string {
    const lines: string[] = [];
    const meta = record.additional_data || {};
    const results = record.data?.results || (Array.isArray(record.data) ? record.data : []);

    // ヘッダー（詳細ページと同じ形式）- サニタイズ適用
    lines.push(`＜${formatDate(new Date(record.date))} 診断ファイル詳細＞`);
    if (record.title) {
        lines.push(`タイトル: ${sanitizeForGoogleDocs(record.title)}`);
    }
    if (meta.hospitalName) {
        lines.push(`病院名: ${sanitizeForGoogleDocs(meta.hospitalName)}`);
    }
    if (record.summary) {
        lines.push(`要点: ${sanitizeForGoogleDocs(record.summary)}`);
    }
    lines.push('');

    // 検査結果（詳細ページと同じ形式）- サニタイズ適用
    if (results.length > 0) {
        lines.push(`[検査結果]`);
        results.forEach((item: any) => {
            const name = sanitizeForGoogleDocs(item.item || item.name || '');
            const value = sanitizeForGoogleDocs(String(item.value || ''));
            const unit = sanitizeForGoogleDocs(item.unit || '');
            const evaluation = sanitizeForGoogleDocs(item.evaluation || '');

            const evalStr = evaluation ? ` (${evaluation})` : '';
            const unitStr = unit ? ` ${unit}` : '';
            lines.push(`${name}: ${value}${unitStr}${evalStr}`);
        });
        lines.push('');
    }

    // セクション（メモ・記録）- 詳細ページと同じ形式 - サニタイズ適用
    const sections = meta.sections || [];
    if (sections.length > 0) {
        sections.forEach((sec: any) => {
            if (sec.title || sec.content) {
                lines.push(`[${sanitizeForGoogleDocs(sec.title) || 'メモ'}]`);
                if (sec.content) {
                    lines.push(sanitizeForGoogleDocs(sec.content));
                }
                lines.push('');
            }
        });
    } else {
        // レガシー形式のメモ対応
        if (meta.notes_list && Array.isArray(meta.notes_list)) {
            meta.notes_list.forEach((note: any) => {
                lines.push(`[${sanitizeForGoogleDocs(note.title) || 'メモ'}]`);
                if (note.content) {
                    lines.push(sanitizeForGoogleDocs(note.content));
                }
                lines.push('');
            });
        } else if (meta.notes) {
            lines.push(`[メモ]`);
            lines.push(sanitizeForGoogleDocs(meta.notes));
            lines.push('');
        }

        // 所見
        if (meta.findings) {
            lines.push(`[所見]`);
            lines.push(sanitizeForGoogleDocs(meta.findings));
            lines.push('');
        }
    }

    return lines.join('\n').trim();
}

// Sync health records to Google Docs
export async function syncRecordsToGoogleDocs(
    records: Array<{
        id: string;
        date: Date;
        title: string | null;
        summary: string | null;
        data: unknown;
        additional_data?: unknown;
    }>,
    headerText?: string
) {
    try {
        const docs = getDocsClient();

        // Build document content (same format as RecordsCopyButton)
        const lines: string[] = [];

        // カスタムヘッダーテキストを追加
        if (headerText && headerText.trim()) {
            lines.push(headerText.trim());
            lines.push('');
            lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            lines.push('');
        }

        lines.push(`【全記録データ】（${records.length}件）`);
        lines.push(`出力日時: ${formatDateTime(new Date())}`);
        lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        lines.push('');

        records.forEach((record, index) => {
            if (index > 0) {
                lines.push('');
                lines.push('──────────────────────────────');
                lines.push('');
            }
            lines.push(formatRecordText(record));
        });

        const content = lines.join('\n');

        // Clear and update document
        await clearDocument(docs, RECORDS_DOC_ID);
        await insertText(docs, RECORDS_DOC_ID, content);

        console.log('✅ Records synced to Google Docs');
        return { success: true };
    } catch (error) {
        console.error('❌ Failed to sync records to Google Docs:', error);
        return { success: false, error: String(error) };
    }
}

// 習慣データの型定義
interface HabitData {
    id: string;
    name: string;
    type: 'yes_no' | 'numeric';
    unit: string | null;
    records: Array<{
        date: Date;
        value: number | null;
    }>;
}

// スマホデータの型定義（日別データ）
interface SmartphoneDataRecord {
    date: Date;
    items: { [key: string]: number };
}

// 期間の定義（習慣用）
type PeriodKey = 'week' | 'threeMonths' | 'halfYear' | 'year' | 'all';
const PERIODS: { key: PeriodKey; label: string; days: number | null; weeksLabel: string }[] = [
    { key: 'week', label: '過去1週間', days: 7, weeksLabel: '1週間' },
    { key: 'threeMonths', label: '過去3ヶ月', days: 90, weeksLabel: '約13週' },
    { key: 'halfYear', label: '過去半年', days: 182, weeksLabel: '約26週' },
    { key: 'year', label: '過去1年', days: 365, weeksLabel: '52週' },
    { key: 'all', label: '全期間', days: null, weeksLabel: '全期間' },
];

// スマホデータ用の期間定義
type SmartphonePeriodKey = 'week' | 'month' | 'threeMonths' | 'halfYear' | 'year';
const SMARTPHONE_PERIODS: { key: SmartphonePeriodKey; label: string; days: number }[] = [
    { key: 'week', label: '過去1週間', days: 7 },
    { key: 'month', label: '過去1ヶ月', days: 30 },
    { key: 'threeMonths', label: '過去3ヶ月', days: 90 },
    { key: 'halfYear', label: '過去半年', days: 182 },
    { key: 'year', label: '過去1年', days: 365 },
];

// 週平均を計算する関数
function calculateWeeklyAverage(habit: HabitData, startDate: Date | null): { avg: number; hasData: boolean } {
    const now = new Date();
    const filteredRecords = habit.records.filter((r) => {
        if (!startDate) return true;
        const recordDate = new Date(r.date);
        return recordDate >= startDate && recordDate <= now;
    });

    if (filteredRecords.length === 0) {
        return { avg: 0, hasData: false };
    }

    const total = filteredRecords.reduce((sum, r) => sum + (r.value ?? 0), 0);

    let weeks: number;
    if (startDate) {
        const diffDays = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        weeks = Math.max(1, diffDays / 7);
    } else {
        const dates = filteredRecords.map(r => new Date(r.date).getTime());
        const minDate = Math.min(...dates);
        const diffDays = Math.ceil((now.getTime() - minDate) / (1000 * 60 * 60 * 24));
        weeks = Math.max(1, diffDays / 7);
    }

    return { avg: total / weeks, hasData: true };
}

// 習慣データを週平均テキスト形式にフォーマット
function formatHabitsWeeklyAverage(habits: HabitData[]): string {
    if (habits.length === 0) {
        return '';
    }

    const now = new Date();
    const lines: string[] = [];
    lines.push('【習慣 週平均サマリー】');
    lines.push(`出力日時: ${formatDateTime(now)}`);
    lines.push('');

    PERIODS.forEach((period) => {
        let startDate: Date | null = null;
        if (period.days !== null) {
            startDate = new Date(now.getTime() - period.days * 24 * 60 * 60 * 1000);
        }

        const habitsWithData: { name: string; avg: number; unit: string | null; type: string }[] = [];

        habits.forEach((habit) => {
            const { avg, hasData } = calculateWeeklyAverage(habit, startDate);
            if (hasData) {
                habitsWithData.push({
                    name: habit.name,
                    avg,
                    unit: habit.unit,
                    type: habit.type,
                });
            }
        });

        if (habitsWithData.length > 0) {
            lines.push(`＜${period.label}（${period.weeksLabel}）＞`);
            habitsWithData.forEach((h) => {
                const avgFormatted = h.avg % 1 === 0 ? h.avg.toString() : h.avg.toFixed(1);
                if (h.type === 'yes_no') {
                    lines.push(`${h.name}: ${avgFormatted}回/週`);
                } else {
                    lines.push(`${h.name}: ${avgFormatted}${h.unit || ''}/週`);
                }
            });
            lines.push('');
        }
    });

    return lines.join('\n').trim();
}

// スマホデータの期間別平均を計算
function calculateSmartphoneAverages(
    records: SmartphoneDataRecord[],
    days: number
): { itemName: string; avg: number; count: number }[] {
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // 期間内のレコードをフィルタリング
    const filteredRecords = records.filter(r => {
        const recordDate = new Date(r.date);
        return recordDate >= startDate && recordDate <= now;
    });

    if (filteredRecords.length === 0) {
        return [];
    }

    // 各項目の値を収集（データがある日のみ）
    const itemValues: { [key: string]: number[] } = {};

    filteredRecords.forEach(record => {
        Object.entries(record.items).forEach(([itemName, value]) => {
            if (value !== null && value !== undefined && !isNaN(value)) {
                if (!itemValues[itemName]) {
                    itemValues[itemName] = [];
                }
                itemValues[itemName].push(value);
            }
        });
    });

    // 平均を計算
    const results: { itemName: string; avg: number; count: number }[] = [];
    Object.entries(itemValues).forEach(([itemName, values]) => {
        if (values.length > 0) {
            const sum = values.reduce((a, b) => a + b, 0);
            const avg = sum / values.length;
            results.push({
                itemName,
                avg: Math.round(avg * 100) / 100, // 小数点2桁
                count: values.length
            });
        }
    });

    // 項目名でソート
    return results.sort((a, b) => a.itemName.localeCompare(b.itemName, 'ja'));
}

// スマホデータをテキスト形式にフォーマット
function formatSmartphoneData(records: SmartphoneDataRecord[]): string {
    if (records.length === 0) {
        return '';
    }

    const now = new Date();
    const lines: string[] = [];
    lines.push('【スマホ データ平均サマリー】');
    lines.push(`出力日時: ${formatDateTime(now)}`);
    lines.push('');

    SMARTPHONE_PERIODS.forEach((period) => {
        const averages = calculateSmartphoneAverages(records, period.days);

        if (averages.length > 0) {
            lines.push(`＜${period.label}＞`);
            averages.forEach((item) => {
                const avgFormatted = Number.isInteger(item.avg)
                    ? item.avg.toString()
                    : item.avg.toFixed(1);
                lines.push(`${item.itemName}: ${avgFormatted} (${item.count}日分)`);
            });
            lines.push('');
        }
    });

    return lines.join('\n').trim();
}

// Sync health profile to Google Docs
export async function syncHealthProfileToGoogleDocs(
    sections: Array<{
        categoryId: string;
        title: string;
        content: string;
        orderIndex: number;
    }>,
    headerText?: string,
    habits?: HabitData[],
    smartphoneData?: SmartphoneDataRecord[]
) {
    try {
        const docs = getDocsClient();

        // Build document content
        const lines: string[] = [];

        // カスタムヘッダーテキストを追加
        if (headerText && headerText.trim()) {
            lines.push(headerText.trim());
            lines.push('');
            lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            lines.push('');
        }

        lines.push('【健康プロフィール/習慣/スマホ】');
        lines.push(`最終更新: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`);
        lines.push('');
        lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        lines.push('');

        // Sort by orderIndex
        const sortedSections = [...sections].sort((a, b) => a.orderIndex - b.orderIndex);

        for (const section of sortedSections) {
            if (section.content.trim()) {
                lines.push(`【${section.title}】`);
                lines.push('');
                lines.push(section.content);
                lines.push('');
                lines.push('---');
                lines.push('');
            }
        }

        // 習慣データを追加
        if (habits && habits.length > 0) {
            lines.push('');
            lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            lines.push('');
            lines.push(formatHabitsWeeklyAverage(habits));
        }

        // スマホデータを追加
        if (smartphoneData && smartphoneData.length > 0) {
            lines.push('');
            lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            lines.push('');
            lines.push(formatSmartphoneData(smartphoneData));
        }

        const content = lines.join('\n');

        // Clear and update document
        await clearDocument(docs, HEALTH_PROFILE_DOC_ID);
        await insertText(docs, HEALTH_PROFILE_DOC_ID, content);

        console.log('✅ Health profile synced to Google Docs');
        return { success: true };
    } catch (error) {
        console.error('❌ Failed to sync health profile to Google Docs:', error);
        return { success: false, error: String(error) };
    }
}
