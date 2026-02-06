/**
 * 健康プロフィール AIチャット v2 - ストリーミングAPI
 *
 * Server-Sent Events (SSE) を使用してリアルタイムで応答を返す
 */

import { NextRequest } from 'next/server';
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
// レート制限（インメモリ）
// ============================================

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW = 60 * 1000;

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
    return input
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/PROFILE_ACTION/gi, '')
        .replace(/EXTRACTED_DATA/gi, '')
        .replace(/システムプロンプト/gi, '')
        .replace(/system\s*prompt/gi, '')
        .replace(/ignore\s*(all|previous)\s*(instructions?)?/gi, '')
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

// ============================================
// 定数
// ============================================

const CONFIDENCE_THRESHOLD_DEFAULT = 0.8;
const CONFIDENCE_THRESHOLD_DELETE = 0.95;
const MAX_HISTORY_MESSAGES = 20;

// ============================================
// 会話履歴のサマリー化
// ============================================

function summarizeHistory(messages: { role: string; content: string }[]): { role: string; content: string }[] {
    if (messages.length <= MAX_HISTORY_MESSAGES) {
        return messages;
    }

    const recentMessages = messages.slice(messages.length - MAX_HISTORY_MESSAGES);
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

## 利用可能なセクションID
  ${sectionIdList}

## あなたの役割

1. **プロフィールの構築・改善**: ユーザーとの対話から健康情報を聞き取り、プロフィールに追加・更新・削除する
2. **健康データの分析・アドバイス**: 上記のプロフィールや診断記録データを読み取り、ユーザーの質問に対して分析・傾向の指摘・生活改善のアドバイスを提供する
3. **Health Hubの使い方サポート**: アプリの機能や使い方について質問されたら、下記のFAQ情報をもとに回答する
4. **自然な対話**: ユーザーの話の流れに沿って深掘りし、適切なタイミングで関連質問をする

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

## 重要なルール

1. **既存情報の尊重**: プロフィールに既に書いてあることは再度質問しない
2. **確認が必要な場合**: confidence < 0.8 の更新は実行前に確認を求める
3. **削除は慎重に**: confidence 0.95以上でないと自動実行しない
4. **必ず質問を含める**: 終了希望以外は必ず1つ質問を含める

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
PROFILE_ACTION-->`;
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

    return { success: true };
}

// ============================================
// メインストリーミングハンドラー
// ============================================

export async function POST(req: NextRequest) {
    // 認証チェック
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token?.email) {
        return new Response(JSON.stringify({ error: '認証されていません' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const user = await prisma.user.findUnique({
        where: { email: token.email }
    });

    if (!user) {
        return new Response(JSON.stringify({ error: 'ユーザーが見つかりません' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // レート制限チェック
    if (!checkRateLimit(user.id)) {
        return new Response(JSON.stringify({ error: 'レート制限を超えました' }), {
            status: 429,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    if (!GOOGLE_API_KEY) {
        return new Response(JSON.stringify({ error: 'AI APIが設定されていません' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const { message, sessionId } = await req.json();

    if (!message || typeof message !== 'string' || !message.trim()) {
        return new Response(JSON.stringify({ error: 'メッセージが必要です' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const userMessage = sanitizeUserInput(message);

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

    // Google Docsからコンテキストを取得
    const [profileResult, recordsResult] = await Promise.all([
        readHealthProfileFromGoogleDocs(),
        readRecordsFromGoogleDocs()
    ]);

    const profileContent = profileResult.success ? profileResult.content || '' : '';
    const recordsContent = recordsResult.success ? recordsResult.content || '' : '';

    // 会話履歴を構築
    const rawHistory = session.messages.map(m => ({
        role: m.role,
        content: m.content
    }));
    const history = summarizeHistory(rawHistory);

    // システムプロンプト生成
    const systemPrompt = buildSystemPromptV2(profileContent, recordsContent);

    // Gemini APIをストリーミングで呼び出し
    const contents = [
        ...history.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        })),
        { role: 'user', parts: [{ text: userMessage }] }
    ];

    const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?key=${GOOGLE_API_KEY}&alt=sse`,
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

    if (!geminiResponse.ok || !geminiResponse.body) {
        return new Response(JSON.stringify({ error: 'AI応答の取得に失敗しました' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // ストリーミングレスポンスを構築
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    let fullResponse = '';
    const sessionIdForClosure = session.id;
    const userIdForClosure = user.id;

    const stream = new ReadableStream({
        async start(controller) {
            const reader = geminiResponse.body!.getReader();
            // PROFILE_ACTIONブロックがチャンクをまたぐ場合のバッファ
            let insideProfileAction = false;
            let pendingBuffer = '';

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n');

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const jsonStr = line.slice(6);
                                if (jsonStr.trim() === '[DONE]') continue;

                                const data = JSON.parse(jsonStr);
                                const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

                                if (text) {
                                    fullResponse += text;

                                    // PROFILE_ACTIONブロックのフィルタリング（チャンクまたぎ対応）
                                    let textToProcess = pendingBuffer + text;
                                    pendingBuffer = '';

                                    if (insideProfileAction) {
                                        // ブロック終了を探す
                                        const endIdx = textToProcess.indexOf('PROFILE_ACTION-->');
                                        if (endIdx !== -1) {
                                            insideProfileAction = false;
                                            textToProcess = textToProcess.substring(endIdx + 'PROFILE_ACTION-->'.length);
                                        } else {
                                            // まだブロック内 - 送信しない
                                            continue;
                                        }
                                    }

                                    // 完全なブロックを除去
                                    textToProcess = textToProcess.replace(/<!--PROFILE_ACTION[\s\S]*?PROFILE_ACTION-->/g, '');

                                    // ブロック開始が含まれているが終了がない場合
                                    const startIdx = textToProcess.indexOf('<!--PROFILE_ACTION');
                                    if (startIdx !== -1) {
                                        insideProfileAction = true;
                                        const beforeBlock = textToProcess.substring(0, startIdx);
                                        if (beforeBlock) {
                                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: beforeBlock })}\n\n`));
                                        }
                                        continue;
                                    }

                                    // 「<!--」で始まるPROFILE_ACTIONの部分的な開始を検出
                                    // (例: チャンク末尾が「<!--PROF」で終わる場合)
                                    const partialMarkerIdx = textToProcess.lastIndexOf('<!--');
                                    if (partialMarkerIdx !== -1 && partialMarkerIdx > textToProcess.length - '<!--PROFILE_ACTION'.length) {
                                        pendingBuffer = textToProcess.substring(partialMarkerIdx);
                                        textToProcess = textToProcess.substring(0, partialMarkerIdx);
                                    }

                                    if (textToProcess) {
                                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: textToProcess })}\n\n`));
                                    }
                                }
                            } catch {
                                // JSONパースエラーは無視
                            }
                        }
                    }
                }

                // バッファに残ったテキストがあれば送信（PROFILE_ACTIONでなかった場合）
                if (pendingBuffer && !insideProfileAction) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: pendingBuffer })}\n\n`));
                }

                // ストリーミング完了後、アクションを処理
                const actionMatch = fullResponse.match(/<!--PROFILE_ACTION\n([\s\S]*?)\nPROFILE_ACTION-->/);

                let actions: ProfileAction[] = [];
                let detectedIssues: DetectedIssue[] = [];
                const executedActions: ProfileAction[] = [];
                const pendingActions: ProfileAction[] = [];

                if (actionMatch) {
                    try {
                        const parsed = JSON.parse(actionMatch[1]);
                        actions = parsed.actions || [];
                        detectedIssues = parsed.detected_issues || [];
                    } catch {
                        // パースエラーは無視
                    }
                }

                // アクションを実行
                for (const action of actions) {
                    if (action.type === 'NONE') continue;

                    const threshold = action.type === 'DELETE' ? CONFIDENCE_THRESHOLD_DELETE : CONFIDENCE_THRESHOLD_DEFAULT;

                    if (action.confidence >= threshold) {
                        const result = await executeProfileAction(userIdForClosure, action);
                        if (result.success) {
                            executedActions.push(action);
                        }
                    } else {
                        pendingActions.push(action);
                    }
                }

                // メッセージを保存
                const cleanResponse = fullResponse
                    .replace(/<!--PROFILE_ACTION[\s\S]*?PROFILE_ACTION-->/g, '')
                    .trim();

                await prisma.healthChatMessage.createMany({
                    data: [
                        { sessionId: sessionIdForClosure, role: 'user', content: userMessage },
                        { sessionId: sessionIdForClosure, role: 'assistant', content: cleanResponse }
                    ]
                });

                // Google Docs同期
                let syncStatus = 'not_needed';
                if (executedActions.length > 0) {
                    try {
                        const allSections = await prisma.healthProfileSection.findMany({
                            where: { userId: userIdForClosure },
                            orderBy: { orderIndex: 'asc' }
                        });

                        await syncHealthProfileToGoogleDocs(
                            allSections.map(s => ({
                                categoryId: s.categoryId,
                                title: s.title,
                                content: s.content,
                                orderIndex: s.orderIndex
                            }))
                        );
                        syncStatus = 'synced';
                    } catch {
                        syncStatus = 'failed';
                    }
                }

                // 完了イベントを送信
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    done: true,
                    sessionId: sessionIdForClosure,
                    executedActions,
                    pendingActions,
                    detectedIssues,
                    syncStatus
                })}\n\n`));

            } catch (error) {
                console.error('Streaming error:', error);
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'ストリーミング中にエラーが発生しました' })}\n\n`));
            } finally {
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        }
    });
}
