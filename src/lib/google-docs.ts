import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';

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

    // ヘッダー（詳細ページと同じ形式）
    lines.push(`＜${formatDate(new Date(record.date))} 診断ファイル詳細＞`);
    if (record.title) {
        lines.push(`タイトル: ${record.title}`);
    }
    if (meta.hospitalName) {
        lines.push(`病院名: ${meta.hospitalName}`);
    }
    if (record.summary) {
        lines.push(`要点: ${record.summary}`);
    }
    lines.push('');

    // 検査結果（詳細ページと同じ形式）
    if (results.length > 0) {
        lines.push(`[検査結果]`);
        results.forEach((item: any) => {
            const name = item.item || item.name || '';
            const value = item.value || '';
            const unit = item.unit || '';
            const evaluation = item.evaluation || '';

            const evalStr = evaluation ? ` (${evaluation})` : '';
            const unitStr = unit ? ` ${unit}` : '';
            lines.push(`${name}: ${value}${unitStr}${evalStr}`);
        });
        lines.push('');
    }

    // セクション（メモ・記録）- 詳細ページと同じ形式
    const sections = meta.sections || [];
    if (sections.length > 0) {
        sections.forEach((sec: any) => {
            if (sec.title || sec.content) {
                lines.push(`[${sec.title || 'メモ'}]`);
                if (sec.content) {
                    lines.push(sec.content);
                }
                lines.push('');
            }
        });
    } else {
        // レガシー形式のメモ対応
        if (meta.notes_list && Array.isArray(meta.notes_list)) {
            meta.notes_list.forEach((note: any) => {
                lines.push(`[${note.title || 'メモ'}]`);
                if (note.content) {
                    lines.push(note.content);
                }
                lines.push('');
            });
        } else if (meta.notes) {
            lines.push(`[メモ]`);
            lines.push(meta.notes);
            lines.push('');
        }

        // 所見
        if (meta.findings) {
            lines.push(`[所見]`);
            lines.push(meta.findings);
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

// Sync health profile to Google Docs
export async function syncHealthProfileToGoogleDocs(
    sections: Array<{
        categoryId: string;
        title: string;
        content: string;
        orderIndex: number;
    }>,
    headerText?: string
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

        lines.push('【健康プロフィール】');
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
