/**
 * AIチャット モード別プロンプトシステム
 *
 * 3つのモード:
 * - profile_building: 健康プロフィール構築（質問マスター駆動）
 * - data_analysis: 診断データ分析・健康相談
 * - help: Health Hub使い方サポート
 *
 * 共通ユーティリティ（旧route.ts/stream/route.tsの重複を統合）
 */

import { DEFAULT_PROFILE_CATEGORIES } from '@/constants/health-profile';
import { HEALTH_QUESTIONS } from '@/constants/health-questions';
import prisma from '@/lib/prisma';

// ============================================
// 型定義
// ============================================

export type ChatMode = 'profile_building' | 'data_analysis' | 'help';

export interface ModeDetectionResult {
    mode: ChatMode;
    confidence: number;
}

export interface PromptContext {
    mode: ChatMode;
    profileContent: string;
    recordsContent: string;
}

export interface ProfileAction {
    type: 'ADD' | 'UPDATE' | 'DELETE' | 'NONE';
    section_id: string;
    target_text?: string;
    new_text?: string;
    reason: string;
    confidence: number;
}

export interface DetectedIssue {
    type: 'DUPLICATE' | 'CONFLICT' | 'OUTDATED' | 'MISSING';
    description: string;
    suggested_resolution: string;
}

// ============================================
// 定数
// ============================================

export const CONFIDENCE_THRESHOLD_DEFAULT = 0.8;
export const CONFIDENCE_THRESHOLD_DELETE = 0.95;
export const MAX_HISTORY_MESSAGES = 20;

const MODE_LABELS: Record<ChatMode, string> = {
    profile_building: '健康プロフィール構築',
    data_analysis: 'データ分析・健康相談',
    help: '使い方サポート',
};

// ============================================
// モード検出
// ============================================

export function detectMode(message: string): ModeDetectionResult {
    const trimmed = message.trim();

    // 明示的な番号選択
    if (/^[1１]$/.test(trimmed) || /プロフィール/.test(trimmed)) {
        return { mode: 'profile_building', confidence: 1.0 };
    }
    if (/^[2２]$/.test(trimmed) || /分析|アドバイス/.test(trimmed)) {
        return { mode: 'data_analysis', confidence: 1.0 };
    }
    if (/^[3３]$/.test(trimmed) || /使い方|ヘルプ/.test(trimmed)) {
        return { mode: 'help', confidence: 1.0 };
    }

    // 動的番号（4以降）+ テーマキーワード
    if (/^[4-9４-９]$/.test(trimmed) || /充実|健康診断.*教|医療データ/.test(trimmed)) {
        return { mode: 'profile_building', confidence: 0.9 };
    }
    if (/スマートウォッチ|Fitbit|fitbit|Gemini|ChatGPT|連携/.test(trimmed)) {
        return { mode: 'help', confidence: 0.9 };
    }

    // 再開セッション
    if (/前回の続き/.test(trimmed)) {
        // 再開時はデフォルトでprofile_building（セッション側でmodeがあればそちら優先）
        return { mode: 'profile_building', confidence: 0.6 };
    }

    // 自由テキストのヒューリスティック
    if (/高い|低い|正常|異常|基準|数値|推移|変化|改善|血圧|コレステロール|血糖|HbA1c/.test(trimmed)) {
        return { mode: 'data_analysis', confidence: 0.7 };
    }
    if (/どうすれば|やり方|方法|ページ|画面|ボタン|設定|登録/.test(trimmed)) {
        return { mode: 'help', confidence: 0.7 };
    }

    // デフォルト: プロフィール構築
    return { mode: 'profile_building', confidence: 0.5 };
}

// ============================================
// MODE_SWITCH検出
// ============================================

export function detectModeSwitch(response: string): ChatMode | null {
    const match = response.match(/<!--MODE_SWITCH:\s*(profile_building|data_analysis|help)\s*-->/);
    return match ? (match[1] as ChatMode) : null;
}

export function stripModeSwitch(response: string): string {
    return response.replace(/<!--MODE_SWITCH:\s*\w+\s*-->/g, '').trim();
}

// ============================================
// システムプロンプト構築
// ============================================

export function buildSystemPrompt(context: PromptContext): string {
    const base = buildBasePrompt(context.mode);

    switch (context.mode) {
        case 'profile_building':
            return base + buildProfileBuildingPrompt(context.profileContent);
        case 'data_analysis':
            return base + buildDataAnalysisPrompt(context.profileContent, context.recordsContent);
        case 'help':
            return base + buildHelpPrompt();
    }
}

// --- 共通ベース ---

function buildBasePrompt(mode: ChatMode): string {
    return `あなたはHealth HubのAIアシスタントです。
現在のモード: **${MODE_LABELS[mode]}**

${buildModeTransitionInstructions(mode)}

## ウェルカムメッセージの番号選択への対応

チャット開始時にユーザーへ番号付きの選択肢を表示しています。ユーザーが数字（半角「1」、全角「１」）や番号に対応する言葉で回答した場合、該当するトピックとして解釈して応答してください。
- 「１」「1」「プロフィール」→ 健康プロフィールの作成・更新の対話を開始
- 「２」「2」「分析」「アドバイス」→ 健康データの分析・アドバイスを開始
- 「３」「3」「使い方」「ヘルプ」→ Health Hubの使い方を説明
- その他の番号 → ウェルカムメッセージで表示した順に対応するトピックを開始
- 「前回の続き」「１」（再開時）→ 直前の会話の文脈を引き継いで会話を続ける

## 設定ページへの誘導

連携や設定に関する質問には、該当する設定ページへ誘導してください：
- Fitbit連携 → /settings/fitbit
- Google Docs連携 → /settings/google-docs
- スマホデータ連携 → /settings/data-sync
- 検査項目の設定 → /profile/settings/items
- ヘルプ・FAQ → /help

`;
}

// --- モード遷移指示 ---

function buildModeTransitionInstructions(currentMode: ChatMode): string {
    return `## 会話の脱線への対応

あなたは現在「${MODE_LABELS[currentMode]}」モードで会話しています。

もしユーザーが現在のモードと異なるトピックについて質問した場合：
1. **その質問に簡潔に回答する**（持っている情報の範囲内で）
2. **回答の最後に、元のモードに自然に戻す一言を添える**（例: 「さて、プロフィールの続きですが…」）
3. **モードを切り替えない**（一時的な脱線として扱う）

ただし、ユーザーが明確にモード変更を要求した場合のみ（例: 「データを分析して」「プロフィールを更新したい」「使い方を教えて」）、
応答の末尾に以下を追加してモード変更を通知してください：
<!--MODE_SWITCH: profile_building-->
<!--MODE_SWITCH: data_analysis-->
<!--MODE_SWITCH: help-->
（該当するモード名を1つだけ記載）`;
}

// --- プロフィール構築モード ---

function buildProfileBuildingPrompt(profileContent: string): string {
    const sectionIdList = DEFAULT_PROFILE_CATEGORIES
        .map(cat => `${cat.id}（${cat.title}）`)
        .join('\n  ');

    const questionGuidance = buildQuestionGuidance(profileContent);

    return `## あなたの役割: 健康プロフィールの構築・改善

ユーザーとの対話から健康情報を聞き取り、プロフィールに追加・更新・削除します。

## 現在の健康プロフィール
${profileContent || '（まだ情報がありません）'}

## 利用可能なセクションID
  ${sectionIdList}

${questionGuidance}

## 重要なルール

1. **質問リストを参考にする**: 上記のヒアリングガイドの質問を参考に、まだプロフィールに情報がないトピックを1つずつ聞いてください
2. **既存情報の尊重**: プロフィールに既に書いてあることは再度質問しない
3. **1度に1つの質問**: ユーザーが圧倒されないよう、1回のメッセージで質問は1つだけ
4. **確認が必要な場合**: confidence < 0.8 の更新は実行前に確認を求める
5. **削除は慎重に**: confidence 0.95以上でないと自動実行しない
6. **必ず質問を含める**: 終了希望以外は必ず1つ質問を含める
7. **自然な相槌**: 回答に対して簡潔な共感を示してから次の質問へ

## 出力形式

応答テキストの後に、以下の形式でJSONを出力:

<!--PROFILE_ACTION
{
  "actions": [
    {
      "type": "ADD" | "UPDATE" | "DELETE" | "NONE",
      "section_id": "セクションID",
      "target_text": "更新/削除対象のテキスト",
      "new_text": "追加/更新後のテキスト",
      "reason": "変更理由",
      "confidence": 0.0-1.0
    }
  ],
  "detected_issues": [],
  "follow_up_topic": "次に聞くと良いトピック"
}
PROFILE_ACTION-->

## 会話の進め方

- ユーザーが「保存して」「終わり」と言ったらセッション終了を提案
- プロフィールが空の場合は基本情報（年齢・身長・体重）から聞く
- プロフィールがある程度埋まっている場合は不足部分を自然に質問`;
}

// --- 質問ガイダンス（プロフィール構築モード用） ---

function buildQuestionGuidance(profileContent: string): string {
    const profileLower = (profileContent || '').toLowerCase();

    // セクション別にプロフィールに情報があるか簡易判定
    const filledSections = new Set<string>();
    for (const cat of DEFAULT_PROFILE_CATEGORIES) {
        // 各セクションのタイトルキーワードがプロフィールに含まれるかチェック
        const titleKeywords = cat.title.replace(/^\d+\.\s*/, '').split(/[・]/);
        const hasContent = titleKeywords.some(kw => profileLower.includes(kw.toLowerCase()));
        if (hasContent && profileContent.length > 50) {
            filledSections.add(cat.id);
        }
    }

    // 未回答のセクションの質問を優先
    const priority3Questions = HEALTH_QUESTIONS
        .filter(q => q.priority === 3)
        .sort((a, b) => {
            // 未入力セクションを先に
            const aFilled = filledSections.has(a.sectionId) ? 1 : 0;
            const bFilled = filledSections.has(b.sectionId) ? 1 : 0;
            if (aFilled !== bFilled) return aFilled - bFilled;
            return a.id.localeCompare(b.id);
        });

    const priority2Questions = HEALTH_QUESTIONS
        .filter(q => q.priority === 2 && !filledSections.has(q.sectionId));

    let guidance = `\n## ヒアリングガイド（質問リスト）\n\n`;
    guidance += `以下の質問リストを参考に、まだプロフィールに情報がないトピックについて聞いてください。\n`;
    guidance += `**優先度3（最重要）** の質問から順に進めてください。既にプロフィールにある情報はスキップしてください。\n\n`;

    guidance += `### 優先度3（最重要）- まずこちらから\n`;
    for (const q of priority3Questions.slice(0, 25)) {
        const sectionName = DEFAULT_PROFILE_CATEGORIES.find(c => c.id === q.sectionId)?.title || q.sectionId;
        guidance += `- **[${sectionName}]** ${q.question}\n  → 意図: ${q.intent}\n`;
    }

    if (priority2Questions.length > 0) {
        guidance += `\n### 優先度2（詳細情報）- 優先度3が終わったら\n`;
        for (const q of priority2Questions.slice(0, 10)) {
            guidance += `- [${q.sectionId}] ${q.question}\n`;
        }
    }

    return guidance;
}

// --- データ分析モード ---

function buildDataAnalysisPrompt(profileContent: string, recordsContent: string): string {
    return `## あなたの役割: 健康データの分析・アドバイス

ユーザーの健康プロフィールと診断記録データを読み取り、質問に対して分析・傾向の指摘・生活改善のアドバイスを提供します。

## 現在の健康プロフィール
${profileContent || '（まだ情報がありません）'}

## 診断記録データ
${recordsContent ? `${recordsContent.substring(0, 8000)}${recordsContent.length > 8000 ? '\n...(以下省略)' : ''}` : '（まだ記録がありません）'}

## 分析の進め方

1. **データに基づいた回答**: 推測ではなく、上記のデータに記録されている事実に基づいて回答する
2. **傾向の指摘**: 経年変化や基準値との比較があれば指摘する
3. **具体的なアドバイス**: 「〜した方がいい」だけでなく、具体的なアクションを提案する
4. **免責事項**: 深刻な健康問題については医師への相談を勧める
5. **質問を含める**: データが不足している場合は追加情報を聞く

## 重要なルール

- プロフィールの更新は行わない（このモードではPROFILE_ACTIONを出力しないでください）
- 医学的な診断は行わない（「〜の可能性があります」「医師にご相談ください」等）
- データがない場合は正直に「データが見つかりません」と伝える`;
}

// --- 使い方サポートモード ---

function buildHelpPrompt(): string {
    return `## あなたの役割: Health Hubの使い方サポート

Health Hubの機能や使い方について質問に回答します。以下のFAQ情報をもとに回答してください。

## Health Hub FAQ情報

### 主な機能
- **健康プロフィール** (/health-profile): AIチャットで対話しながら健康情報を整理。11のカテゴリ（基本属性、遺伝・家族歴、病歴、生理機能、生活リズム、食生活、嗜好品・薬、運動、メンタル、美容、環境）で管理
- **診断記録** (/records): 健康診断の結果を管理。写真のアップロード、AI自動読み取り（OCR）、手入力に対応
- **データ推移** (/trends): 検査値やスマホデータの推移をグラフ・表で可視化
- **習慣トラッキング** (/habits): 日々の生活習慣やサプリメントの記録
- **動画** (/videos): 健康に関する動画コンテンツ
- **提携クリニック** (/clinics): 提携クリニック情報
- **オンライン処方** (/prescription): オンライン処方サービス

### データ連携
- **Fitbit連携** (/settings/fitbit): OAuth認証で心拍数、睡眠、HRV、歩数などを自動同期
- **Android Health Connect** (/settings/data-sync): スマホのHealth Connectアプリ経由でGarmin、Samsung等のデータも同期可能
- **Google Docs連携** (/settings/google-docs): 健康データをGoogle Docsに自動エクスポート。ChatGPTやGeminiなど外部AIとのデータ共有に利用可能

### データの入力方法
- **AI自動入力**: 健康診断結果の写真をアップロード → AIが自動で読み取り
- **手入力**: 検査値を直接入力
- **デバイス連携**: Fitbit・Health Connectからの自動取り込み

## 回答ルール

- 設定や連携の質問には、必ず該当する設定ページのパスを案内する
- 操作の具体的な手順を説明する
- スクリーンショットは表示できないので、テキストで分かりやすく説明する
- プロフィールの更新は行わない（このモードではPROFILE_ACTIONを出力しないでください）
- 知らない機能について聞かれたら「その機能はまだ対応していないかもしれません」と正直に伝える`;
}

// ============================================
// 共通ユーティリティ
// ============================================

export function sanitizeUserInput(input: string): string {
    return input
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/PROFILE_ACTION/gi, '')
        .replace(/EXTRACTED_DATA/gi, '')
        .replace(/MODE_SWITCH/gi, '')
        .replace(/システムプロンプト/gi, '')
        .replace(/system\s*prompt/gi, '')
        .replace(/ignore\s*(all|previous)\s*(instructions?)?/gi, '')
        .trim();
}

export function summarizeHistory(messages: { role: string; content: string }[]): { role: string; content: string }[] {
    if (messages.length <= MAX_HISTORY_MESSAGES) {
        return messages;
    }

    const oldMessages = messages.slice(0, messages.length - MAX_HISTORY_MESSAGES);
    const recentMessages = messages.slice(messages.length - MAX_HISTORY_MESSAGES);

    const topics = new Set<string>();
    for (const msg of oldMessages) {
        const keywords = msg.content.match(/(?:について|に関して|の話|を記録|を追加|を削除)/g);
        if (keywords) {
            topics.add(msg.content.slice(0, 50));
        }
    }

    const summaryText = topics.size > 0
        ? `【これまでの会話サマリー】\n過去の会話で以下のトピックについて話しました: ${Array.from(topics).slice(0, 5).join('、')}...\n\n`
        : '';

    if (summaryText) {
        return [
            { role: 'user', content: summaryText },
            ...recentMessages
        ];
    }

    return recentMessages;
}

export async function executeProfileAction(
    userId: string,
    action: ProfileAction
): Promise<{ success: boolean; error?: string }> {
    if (action.type === 'NONE') {
        return { success: true };
    }

    const sectionId = action.section_id;
    const sectionMeta = DEFAULT_PROFILE_CATEGORIES.find(c => c.id === sectionId);
    if (!sectionMeta) {
        return { success: false, error: `Unknown section: ${sectionId}` };
    }

    const existingSection = await prisma.healthProfileSection.findUnique({
        where: { userId_categoryId: { userId, categoryId: sectionId } }
    });

    let newContent = existingSection?.content || '';

    switch (action.type) {
        case 'ADD':
            if (action.new_text) {
                newContent = newContent
                    ? `${newContent}\n${action.new_text}`
                    : action.new_text;
            }
            break;

        case 'UPDATE':
            if (action.target_text && action.new_text) {
                const lines = newContent.split('\n');
                const updatedLines = lines.map(line =>
                    line.includes(action.target_text!) ? action.new_text! : line
                );
                newContent = updatedLines.join('\n');
            }
            break;

        case 'DELETE':
            if (action.target_text) {
                const lines = newContent.split('\n');
                const filteredLines = lines.filter(line =>
                    !line.includes(action.target_text!)
                );
                newContent = filteredLines.join('\n').trim();
            }
            break;
    }

    await prisma.healthProfileSection.upsert({
        where: { userId_categoryId: { userId, categoryId: sectionId } },
        create: {
            userId,
            categoryId: sectionId,
            title: sectionMeta.title,
            content: newContent,
            orderIndex: sectionMeta.order
        },
        update: { content: newContent }
    });

    return { success: true };
}
