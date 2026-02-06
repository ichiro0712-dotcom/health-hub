/**
 * 健康プロフィール AIチャット v2
 *
 * アーキテクチャ: Google Docsを信頼できる情報源として使用
 * - チャット開始時にGoogle Docsから全プロフィールを読み込み
 * - AIが全コンテキストを把握した上で対話
 * - 重複検出・解決をAIが自律的に実行
 *
 * 監査対応済み:
 * - pendingActionsの「はい」実行ロジック
 * - confidence閾値統一（0.8）
 * - 医療免責事項
 * - レート制限
 * - プロンプトインジェクション対策
 * - エラーコード体系
 * - 会話履歴のサマリー化
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from '@/lib/prisma';
import { DEFAULT_PROFILE_CATEGORIES } from '@/constants/health-profile';
import {
    readHealthProfileFromGoogleDocs,
    readRecordsFromGoogleDocs,
    syncHealthProfileToGoogleDocs
} from '@/lib/google-docs';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

// ============================================
// エラーコード定義
// ============================================

const ERROR_CODES = {
    CHAT_001: { code: 'CHAT_001', message: '認証されていません', status: 401 },
    CHAT_002: { code: 'CHAT_002', message: 'ユーザーが見つかりません', status: 404 },
    CHAT_003: { code: 'CHAT_003', message: 'AI APIが設定されていません', status: 500 },
    CHAT_004: { code: 'CHAT_004', message: 'メッセージが必要です', status: 400 },
    CHAT_005: { code: 'CHAT_005', message: 'メッセージが長すぎます（5000文字以内）', status: 400 },
    CHAT_006: { code: 'CHAT_006', message: 'AI応答の取得に失敗しました', status: 500 },
    CHAT_007: { code: 'CHAT_007', message: 'レート制限を超えました。しばらく待ってから再試行してください', status: 429 },
    CHAT_008: { code: 'CHAT_008', message: 'Google Docs同期に失敗しました', status: 500 },
    CHAT_009: { code: 'CHAT_009', message: 'チャット処理に失敗しました', status: 500 },
} as const;

// ============================================
// レート制限（インメモリ、本番はRedis推奨）
// ============================================

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 20;  // 1分間の最大リクエスト数
const RATE_LIMIT_WINDOW = 60 * 1000;  // 1分

function checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const record = rateLimitMap.get(userId);

    if (!record || now > record.resetAt) {
        rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
        return true;
    }

    if (record.count >= RATE_LIMIT_MAX) {
        return false;
    }

    record.count++;
    return true;
}

// ============================================
// プロンプトインジェクション対策
// ============================================

function sanitizeUserInput(input: string): string {
    // 危険なパターンを除去
    return input
        .replace(/<!--[\s\S]*?-->/g, '')  // HTMLコメント
        .replace(/PROFILE_ACTION/gi, '')   // 特殊マーカー
        .replace(/EXTRACTED_DATA/gi, '')   // 特殊マーカー
        .replace(/システムプロンプト/gi, '')  // システムプロンプトへの言及
        .replace(/system\s*prompt/gi, '')
        .replace(/ignore\s*(all|previous)\s*(instructions?)?/gi, '')  // インジェクション試行
        .trim();
}

// ============================================
// 型定義
// ============================================

interface ProfileAction {
    type: 'ADD' | 'UPDATE' | 'DELETE' | 'NONE';
    section_id: string;
    target_text?: string;
    new_text?: string;
    reason: string;
    confidence: number;
}

interface DetectedIssue {
    type: 'DUPLICATE' | 'CONFLICT' | 'OUTDATED' | 'MISSING';
    description: string;
    suggested_resolution: string;
}

interface ParsedAIResponse {
    responseText: string;
    actions: ProfileAction[];
    detectedIssues: DetectedIssue[];
    followUpTopic?: string;
}

// ============================================
// 定数
// ============================================

// 信頼度閾値（プロンプトと統一: 0.8）
const CONFIDENCE_THRESHOLD_DEFAULT = 0.8;
const CONFIDENCE_THRESHOLD_DELETE = 0.95;

// 会話履歴の最大件数（それ以上はサマリー化）
const MAX_HISTORY_MESSAGES = 20;

// (医療免責事項はGemini自体のポリシーに委任)

// ============================================
// 会話履歴のサマリー化
// ============================================

function summarizeHistory(messages: { role: string; content: string }[]): { role: string; content: string }[] {
    if (messages.length <= MAX_HISTORY_MESSAGES) {
        return messages;
    }

    // 古いメッセージをサマリー化
    const oldMessages = messages.slice(0, messages.length - MAX_HISTORY_MESSAGES);
    const recentMessages = messages.slice(messages.length - MAX_HISTORY_MESSAGES);

    // サマリーを作成（簡易版）
    const topics = new Set<string>();
    for (const msg of oldMessages) {
        // キーワード抽出（簡易）
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

// ============================================
// システムプロンプト生成
// ============================================

function buildSystemPromptV2(
    profileContent: string,
    recordsContent: string
): string {
    const sectionIdList = DEFAULT_PROFILE_CATEGORIES
        .map(cat => `${cat.id}（${cat.title}）`)
        .join('\n  ');

    return `あなたはHealth Hubの健康プロフィール構築・改善・分析を支援するAIアシスタントです。

## あなたが持っている情報

### 現在の健康プロフィール（Google Docsから読み込み）
${profileContent || '（まだ情報がありません）'}

### 診断記録データ（Google Docsから読み込み）
${recordsContent ? `${recordsContent.substring(0, 8000)}${recordsContent.length > 8000 ? '\n...(以下省略)' : ''}` : '（まだ記録がありません）'}

## あなたの役割

1. **ユーザーの意図を理解する**
   - 情報を追加したい
   - 情報を修正・削除したい
   - 健康データについて質問・相談したい
   - プロフィールを充実させたい
   - Health Hubの使い方を知りたい

2. **プロフィールの改善**
   - ユーザーが話した内容から健康情報を抽出
   - 既存情報と照らし合わせて重複・矛盾を検出
   - 適切なセクションに情報を整理

3. **健康データの分析・アドバイス**
   - 上記のプロフィールや診断記録データを読み取り、傾向や気になる点を指摘する
   - ユーザーの質問に対して、記録されたデータに基づいた生活改善のアドバイスを提供する
   - 数値の経年変化や基準値との比較など、データに基づいた分析を行う

4. **Health Hubの使い方サポート**
   - アプリの機能や使い方について質問されたら、下記のFAQ情報をもとに回答する

5. **自然な対話**
   - 固定の質問リストに縛られない
   - ユーザーの話の流れに沿って深掘り
   - 適切なタイミングで関連質問
   - プロフィールに既に書いてあることは質問しない

## ウェルカムメッセージの番号選択への対応

チャット開始時にユーザーへ番号付きの選択肢を表示しています。ユーザーが数字（半角「1」、全角「１」）や番号に対応する言葉で回答した場合、該当するトピックとして解釈して応答してください。
- 「１」「1」「プロフィール」→ 健康プロフィールの作成・更新の対話を開始
- 「２」「2」「分析」「アドバイス」→ 健康データの分析・アドバイスを開始
- 「３」「3」「使い方」「ヘルプ」→ Health Hubの使い方を説明
- その他の番号 → ウェルカムメッセージで表示した順に対応するトピックを開始
- 「前回の続き」「１」（再開時）→ 直前の会話の文脈を引き継いで会話を続ける

## 設定ページへの誘導

連携や設定に関する質問には、チャット内で設定を完結させず、該当する設定ページへ誘導してください：
- Fitbit連携 → 「Fitbitの連携は設定画面から行えます。こちらをご確認ください → /settings/fitbit」
- Google Docs連携 → 「Google Docsの連携設定はこちら → /settings/google-docs」
- スマホデータ連携 → 「スマートフォンとの連携設定はこちら → /settings/data-sync」
- 検査項目の設定 → 「検査項目の設定はこちら → /profile/settings/items」
- ヘルプ・FAQ → 「詳しくはヘルプページをご覧ください → /help」

## Health Hub FAQ情報

以下はHealth Hubの主な機能です。使い方について質問されたらこの情報をもとに回答してください。

### 主な機能
- **健康プロフィール** (/health-profile): AIチャットで対話しながら健康情報を整理。11のカテゴリ（基本属性、遺伝・家族歴、病歴、生理機能、生活リズム、食生活、嗜好品・薬、運動、メンタル、美容、環境）で管理
- **診断記録** (/records): 健康診断の結果を管理。写真のアップロード、AI自動読み取り（OCR）、手入力に対応
- **データ推移** (/trends): 検査値やスマホデータの推移をグラフ・表で可視化。経年変化の確認に便利
- **習慣トラッキング** (/habits): 日々の生活習慣やサプリメントの記録
- **動画** (/videos): 健康に関する動画コンテンツ
- **提携クリニック** (/clinics): 提携クリニック情報
- **オンライン処方** (/prescription): オンライン処方サービス

### データ連携
- **Fitbit連携** (/settings/fitbit): OAuth認証で心拍数、睡眠、HRV、歩数などを自動同期
- **Android Health Connect**: スマホのHealth Connectアプリ経由でGarmin、Samsung等のデータも同期可能
- **Google Docs連携** (/settings/google-docs): 健康データをGoogle Docsに自動エクスポート。ChatGPTやGeminiなど外部AIとのデータ共有に利用可能

### データの入力方法
- **AI自動入力**: 健康診断結果の写真をアップロード → AIが自動で読み取り
- **手入力**: 検査値を直接入力
- **デバイス連携**: Fitbit・Health Connectからの自動取り込み

## 利用可能なセクションID
  ${sectionIdList}

## 重要なルール

1. **既存情報の尊重**: プロフィールに既に書いてあることは再度質問しない
2. **重複検出**: 同じ情報が複数回記載されていたら検出して報告
3. **矛盾検出**: 診断記録とプロフィールの矛盾を発見したら確認
4. **確認が必要な場合**: confidence < 0.8 の更新は実行前に確認を求める
5. **削除・大幅修正は慎重に**: confidence 0.95以上でないと自動実行しない

## 出力形式

必ず以下の形式で出力してください:

1. ユーザーへの応答テキスト（自然な日本語）
2. プロフィール更新アクション（JSON形式）

応答テキストの後に、以下の形式でJSONを出力:

<!--PROFILE_ACTION
{
  "actions": [
    {
      "type": "ADD" | "UPDATE" | "DELETE" | "NONE",
      "section_id": "セクションID（例: basic_attributes, diet_nutrition）",
      "target_text": "更新/削除対象のテキスト（部分一致で検索）",
      "new_text": "追加/更新後のテキスト（箇条書き推奨）",
      "reason": "変更理由",
      "confidence": 0.0-1.0
    }
  ],
  "detected_issues": [
    {
      "type": "DUPLICATE" | "CONFLICT" | "OUTDATED" | "MISSING",
      "description": "問題の説明",
      "suggested_resolution": "解決案"
    }
  ],
  "follow_up_topic": "次に聞くと良いトピック（任意）"
}
PROFILE_ACTION-->

## 例

ユーザー: 「最近朝食を抜くようになった」

応答例:
「なるほど、朝食を抜くようになったんですね。プロフィールを更新しておきます。

ちなみに、朝食を抜くようになった理由はありますか？（時間がない、食欲がない、ダイエット目的など）」

<!--PROFILE_ACTION
{
  "actions": [
    {
      "type": "ADD",
      "section_id": "diet_nutrition",
      "new_text": "・朝食を抜くことが多い",
      "reason": "ユーザーが朝食を抜くようになったと発言",
      "confidence": 0.9
    }
  ],
  "detected_issues": [],
  "follow_up_topic": "朝食を抜く理由"
}
PROFILE_ACTION-->

## 会話の進め方

- 最初はユーザーの話を聞く姿勢で
- プロフィールが空の場合は基本情報から聞く
- プロフィールがある程度埋まっている場合は不足部分を自然に質問
- ユーザーが「保存して」「終わり」と言ったらセッション終了を提案

## 重要: 必ず次の質問をすること

**あなたの応答には必ず質問を1つ含めてください**（ユーザーが終了を希望した場合を除く）。

ユーザーが健康情報を話したら：
1. まず共感・理解を示す（1文）
2. 情報を記録したことを伝える（任意、簡潔に）
3. **必ず関連する深掘り質問または次のトピックへの質問をする**

質問のパターン：
- **深掘り質問**: 「その症状はいつ頃から？」「頻度は？」「きっかけは？」
- **関連質問**: 「他に気になる症状はありますか？」
- **新トピック質問**: 「睡眠についてはいかがですか？」`;
}

// ============================================
// Gemini API呼び出し
// ============================================

async function callGeminiAPI(
    systemPrompt: string,
    history: { role: string; content: string }[],
    userMessage: string
): Promise<string> {
    const contents = [
        ...history.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        })),
        { role: 'user', parts: [{ text: userMessage }] }
    ];

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents,
                generationConfig: {
                    temperature: 0.4,
                    maxOutputTokens: 4096,
                }
            })
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error:', errorText);
        throw new Error(ERROR_CODES.CHAT_006.message);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ============================================
// AIレスポンスの解析
// ============================================

function parseAIResponse(response: string): ParsedAIResponse {
    const actionMatch = response.match(/<!--PROFILE_ACTION\n([\s\S]*?)\nPROFILE_ACTION-->/);

    let responseText = response
        .replace(/<!--PROFILE_ACTION[\s\S]*?PROFILE_ACTION-->/g, '')
        .replace(/```json[\s\S]*?```/g, '')
        .replace(/```[\s\S]*?```/g, '')
        .trim();

    let actions: ProfileAction[] = [];
    let detectedIssues: DetectedIssue[] = [];
    let followUpTopic: string | undefined;

    if (actionMatch) {
        try {
            const parsed = JSON.parse(actionMatch[1]);
            actions = parsed.actions || [];
            detectedIssues = parsed.detected_issues || [];
            followUpTopic = parsed.follow_up_topic;
        } catch (e) {
            console.error('Failed to parse PROFILE_ACTION:', e);
        }
    }

    return { responseText, actions, detectedIssues, followUpTopic };
}

// ============================================
// プロフィールアクションの実行
// ============================================

async function executeProfileAction(
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

    console.log(`✅ Profile action executed: ${action.type} on ${sectionId}`);
    return { success: true };
}

// ============================================
// 検出された問題をユーザーフレンドリーに整形
// ============================================

function formatIssuesForUser(issues: DetectedIssue[]): string {
    if (issues.length === 0) return '';

    let message = '\n\n---\n**プロフィールの改善提案**:\n';

    for (const issue of issues) {
        const icon = {
            DUPLICATE: '📋',
            CONFLICT: '⚠️',
            OUTDATED: '🕐',
            MISSING: '📝'
        }[issue.type];

        message += `${icon} ${issue.description}\n   → ${issue.suggested_resolution}\n`;
    }

    message += '\n「修正して」「統合して」などと言っていただければ対応します。';
    return message;
}

// ============================================
// 保留アクションの整形
// ============================================

function formatPendingActionsForUser(actions: ProfileAction[]): string {
    if (actions.length === 0) return '';

    let message = '\n\n---\n**確認が必要な更新**:\n';

    for (let i = 0; i < actions.length; i++) {
        const action = actions[i];
        const actionTypeLabel = {
            ADD: '追加',
            UPDATE: '更新',
            DELETE: '削除',
            NONE: ''
        }[action.type];

        const sectionMeta = DEFAULT_PROFILE_CATEGORIES.find(c => c.id === action.section_id);
        const sectionName = sectionMeta?.title || action.section_id;

        message += `${i + 1}. 【${sectionName}】${actionTypeLabel}: ${action.new_text || action.target_text || ''}\n`;
        message += `   理由: ${action.reason}\n`;
    }

    message += '\n「はい」または「OK」で上記の更新を実行します。「いいえ」でキャンセルします。';
    return message;
}

// ============================================
// Google Docs同期（エラー通知付き）
// ============================================

async function syncToGoogleDocsWithNotification(
    userId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const allSections = await prisma.healthProfileSection.findMany({
            where: { userId },
            orderBy: { orderIndex: 'asc' }
        });

        if (allSections.length === 0) {
            return { success: true };
        }

        await syncHealthProfileToGoogleDocs(
            allSections.map(s => ({
                categoryId: s.categoryId,
                title: s.title,
                content: s.content,
                orderIndex: s.orderIndex
            }))
        );

        return { success: true };
    } catch (err) {
        console.error('Google Docs sync failed:', err);
        return { success: false, error: ERROR_CODES.CHAT_008.message };
    }
}

// ============================================
// メインハンドラー
// ============================================

export async function POST(req: NextRequest) {
    try {
        // 認証チェック
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (!token?.email) {
            return NextResponse.json(ERROR_CODES.CHAT_001, { status: ERROR_CODES.CHAT_001.status });
        }

        const user = await prisma.user.findUnique({
            where: { email: token.email }
        });

        if (!user) {
            return NextResponse.json(ERROR_CODES.CHAT_002, { status: ERROR_CODES.CHAT_002.status });
        }

        // レート制限チェック
        if (!checkRateLimit(user.id)) {
            return NextResponse.json(ERROR_CODES.CHAT_007, { status: ERROR_CODES.CHAT_007.status });
        }

        if (!GOOGLE_API_KEY) {
            return NextResponse.json(ERROR_CODES.CHAT_003, { status: ERROR_CODES.CHAT_003.status });
        }

        // リクエストボディ
        const { message, sessionId, pendingActionsToExecute } = await req.json();

        if (!message || typeof message !== 'string' || !message.trim()) {
            return NextResponse.json(ERROR_CODES.CHAT_004, { status: ERROR_CODES.CHAT_004.status });
        }

        if (message.length > 5000) {
            return NextResponse.json(ERROR_CODES.CHAT_005, { status: ERROR_CODES.CHAT_005.status });
        }

        // プロンプトインジェクション対策
        const userMessage = sanitizeUserInput(message);

        // 終了リクエストの検出
        const isEndRequest = /ここまで保存|保存して|終わり|やめ|中断/.test(userMessage);

        // 確認応答の検出（pendingActions実行）
        const isConfirmation = /^(はい|うん|OK|オッケー|お願い|実行|やって)$/i.test(userMessage.trim());
        const isRejection = /^(いいえ|いや|やめ|キャンセル|だめ)$/i.test(userMessage.trim());

        // セッション取得または作成
        let session = sessionId
            ? await prisma.healthChatSession.findFirst({
                where: { id: sessionId, userId: user.id },
                include: { messages: { orderBy: { createdAt: 'asc' } } }
            })
            : null;

        if (!session) {
            session = await prisma.healthChatSession.create({
                data: {
                    userId: user.id,
                    status: 'active',
                    currentPriority: 3,
                },
                include: { messages: { orderBy: { createdAt: 'asc' } } }
            });
        }

        // ============================================
        // pendingActionsの「はい」実行ロジック
        // ============================================
        if (pendingActionsToExecute && pendingActionsToExecute.length > 0 && isConfirmation) {
            const executedActions: ProfileAction[] = [];

            for (const action of pendingActionsToExecute as ProfileAction[]) {
                const result = await executeProfileAction(user.id, action);
                if (result.success) {
                    executedActions.push(action);
                }
            }

            // 同期
            const syncResult = await syncToGoogleDocsWithNotification(user.id);

            const confirmResponse = executedActions.length > 0
                ? `✅ ${executedActions.length}件の更新を実行しました。\n\n他に何かありますか？`
                : '更新はありませんでした。';

            await prisma.healthChatMessage.createMany({
                data: [
                    { sessionId: session.id, role: 'user', content: userMessage },
                    { sessionId: session.id, role: 'assistant', content: confirmResponse }
                ]
            });

            return NextResponse.json({
                success: true,
                response: confirmResponse,
                sessionId: session.id,
                sessionStatus: 'active',
                executedActions,
                pendingActions: [],
                syncStatus: syncResult.success ? 'synced' : 'failed',
                syncError: syncResult.error
            });
        }

        // 拒否応答の処理
        if (pendingActionsToExecute && pendingActionsToExecute.length > 0 && isRejection) {
            const rejectResponse = '了解しました。更新はキャンセルしました。\n\n他に何かありますか？';

            await prisma.healthChatMessage.createMany({
                data: [
                    { sessionId: session.id, role: 'user', content: userMessage },
                    { sessionId: session.id, role: 'assistant', content: rejectResponse }
                ]
            });

            return NextResponse.json({
                success: true,
                response: rejectResponse,
                sessionId: session.id,
                sessionStatus: 'active',
                executedActions: [],
                pendingActions: []
            });
        }

        // 終了リクエスト処理
        if (isEndRequest) {
            await prisma.healthChatSession.update({
                where: { id: session.id },
                data: { status: 'paused' }
            });

            const endResponse = 'お疲れさまでした！プロフィールを保存しました。続きはいつでも再開できます。';

            await prisma.healthChatMessage.createMany({
                data: [
                    { sessionId: session.id, role: 'user', content: userMessage },
                    { sessionId: session.id, role: 'assistant', content: endResponse }
                ]
            });

            // Google Docsに同期
            const syncResult = await syncToGoogleDocsWithNotification(user.id);

            return NextResponse.json({
                success: true,
                response: endResponse,
                sessionId: session.id,
                sessionStatus: 'paused',
                syncStatus: syncResult.success ? 'synced' : 'failed',
                syncError: syncResult.error
            });
        }

        // Google Docsからコンテキストを取得
        const [profileResult, recordsResult] = await Promise.all([
            readHealthProfileFromGoogleDocs(),
            readRecordsFromGoogleDocs()
        ]);

        const profileContent = profileResult.success ? profileResult.content || '' : '';
        const recordsContent = recordsResult.success ? recordsResult.content || '' : '';

        // 会話履歴を構築（サマリー化対応）
        const rawHistory = session.messages.map(m => ({
            role: m.role,
            content: m.content
        }));
        const history = summarizeHistory(rawHistory);

        // システムプロンプト生成
        const systemPrompt = buildSystemPromptV2(profileContent, recordsContent);

        // AI呼び出し
        const aiResponse = await callGeminiAPI(systemPrompt, history, userMessage);

        // レスポンス解析
        const { responseText, actions, detectedIssues, followUpTopic } = parseAIResponse(aiResponse);

        // 高信頼度のアクションを実行
        const executedActions: ProfileAction[] = [];
        const pendingActions: ProfileAction[] = [];

        for (const action of actions) {
            if (action.type === 'NONE') continue;

            // 信頼度に基づいて実行/保留を判断（閾値統一: 0.8）
            const threshold = action.type === 'DELETE' ? CONFIDENCE_THRESHOLD_DELETE : CONFIDENCE_THRESHOLD_DEFAULT;

            if (action.confidence >= threshold) {
                const result = await executeProfileAction(user.id, action);
                if (result.success) {
                    executedActions.push(action);
                }
            } else {
                pendingActions.push(action);
            }
        }

        // 最終レスポンス構築
        let finalResponse = responseText;

        // 検出された問題を追加
        if (detectedIssues.length > 0) {
            finalResponse += formatIssuesForUser(detectedIssues);
        }

        // 保留中のアクションがある場合（詳細表示）
        if (pendingActions.length > 0) {
            finalResponse += formatPendingActionsForUser(pendingActions);
        }

        // メッセージ保存
        await prisma.healthChatMessage.createMany({
            data: [
                { sessionId: session.id, role: 'user', content: userMessage },
                { sessionId: session.id, role: 'assistant', content: finalResponse }
            ]
        });

        // アクションが実行された場合、Google Docs同期
        let syncStatus = 'not_needed';
        let syncError: string | undefined;

        if (executedActions.length > 0) {
            const syncResult = await syncToGoogleDocsWithNotification(user.id);
            syncStatus = syncResult.success ? 'synced' : 'failed';
            syncError = syncResult.error;
        }

        return NextResponse.json({
            success: true,
            response: finalResponse,
            sessionId: session.id,
            sessionStatus: 'active',
            executedActions,
            pendingActions,
            detectedIssues,
            followUpTopic,
            syncStatus,
            syncError
        });

    } catch (error) {
        console.error('Health chat v2 error:', error);
        return NextResponse.json(
            { ...ERROR_CODES.CHAT_009, details: error instanceof Error ? error.message : 'Unknown error' },
            { status: ERROR_CODES.CHAT_009.status }
        );
    }
}
