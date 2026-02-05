/**
 * 健康プロフィール AIチャット v2
 *
 * 新アーキテクチャ: Google Docsを信頼できる情報源として使用
 * - チャット開始時にGoogle Docsから全プロフィールを読み込み
 * - AIが全コンテキストを把握した上で対話
 * - 重複検出・解決をAIが自律的に実行
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
// システムプロンプト生成
// ============================================

function buildSystemPromptV2(
    profileContent: string,
    recordsContent: string
): string {
    // セクションIDリスト
    const sectionIdList = DEFAULT_PROFILE_CATEGORIES
        .map(cat => `${cat.id}（${cat.title}）`)
        .join('\n  ');

    return `あなたは健康プロフィールの構築・改善を支援するAIアシスタントです。

## あなたが持っている情報

### 現在の健康プロフィール（Google Docsから読み込み）
${profileContent || '（まだ情報がありません）'}

### 診断記録データ（Google Docsから読み込み）
${recordsContent ? `${recordsContent.substring(0, 8000)}${recordsContent.length > 8000 ? '\n...(以下省略)' : ''}` : '（まだ記録がありません）'}

## あなたの役割

1. **ユーザーの意図を理解する**
   - 情報を追加したい
   - 情報を修正・削除したい
   - 質問に答えてほしい
   - プロフィールを充実させたい
   - 雑談や相談

2. **プロフィールの改善**
   - ユーザーが話した内容から健康情報を抽出
   - 既存情報と照らし合わせて重複・矛盾を検出
   - 適切なセクションに情報を整理

3. **自然な対話**
   - 固定の質問リストに縛られない
   - ユーザーの話の流れに沿って深掘り
   - 適切なタイミングで関連質問
   - プロフィールに既に書いてあることは質問しない

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
- ユーザーが「保存して」「終わり」と言ったらセッション終了を提案`;
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
                    temperature: 0.4,  // 情報抽出は低め、会話は自然に
                    maxOutputTokens: 4096,
                }
            })
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error:', errorText);
        throw new Error('AI応答の取得に失敗しました');
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ============================================
// AIレスポンスの解析
// ============================================

function parseAIResponse(response: string): ParsedAIResponse {
    // PROFILE_ACTION JSONを抽出
    const actionMatch = response.match(/<!--PROFILE_ACTION\n([\s\S]*?)\nPROFILE_ACTION-->/);

    // クリーンなレスポンステキスト（JSONブロックを除去）
    let responseText = response
        .replace(/<!--PROFILE_ACTION[\s\S]*?PROFILE_ACTION-->/g, '')
        .replace(/```json[\s\S]*?```/g, '')
        .replace(/```[\s\S]*?```/g, '')
        .trim();

    // デフォルト値
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

    // 現在のセクション内容を取得
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
                // 対象テキストを含む行を置換
                const lines = newContent.split('\n');
                const updatedLines = lines.map(line =>
                    line.includes(action.target_text!) ? action.new_text! : line
                );
                newContent = updatedLines.join('\n');
            }
            break;

        case 'DELETE':
            if (action.target_text) {
                // 対象テキストを含む行を削除
                const lines = newContent.split('\n');
                const filteredLines = lines.filter(line =>
                    !line.includes(action.target_text!)
                );
                newContent = filteredLines.join('\n').trim();
            }
            break;
    }

    // DBを更新
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
// メインハンドラー
// ============================================

export async function POST(req: NextRequest) {
    try {
        // 認証チェック
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (!token?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: token.email }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        if (!GOOGLE_API_KEY) {
            return NextResponse.json({ error: 'AI API not configured' }, { status: 500 });
        }

        // リクエストボディ
        const { message, sessionId } = await req.json();

        if (!message || typeof message !== 'string' || !message.trim()) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        const userMessage = message.trim();

        // 終了リクエストの検出
        const isEndRequest = /ここまで保存|保存して|終わり|やめ|中断/.test(userMessage);

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

        // 終了リクエスト処理
        if (isEndRequest) {
            await prisma.healthChatSession.update({
                where: { id: session.id },
                data: { status: 'paused' }
            });

            await prisma.healthChatMessage.createMany({
                data: [
                    { sessionId: session.id, role: 'user', content: userMessage },
                    { sessionId: session.id, role: 'assistant', content: 'お疲れさまでした！プロフィールを保存しました。続きはいつでも再開できます。' }
                ]
            });

            // Google Docsに同期
            const allSections = await prisma.healthProfileSection.findMany({
                where: { userId: user.id },
                orderBy: { orderIndex: 'asc' }
            });

            if (allSections.length > 0) {
                syncHealthProfileToGoogleDocs(
                    allSections.map(s => ({
                        categoryId: s.categoryId,
                        title: s.title,
                        content: s.content,
                        orderIndex: s.orderIndex
                    }))
                ).catch(err => console.error('Google Docs sync failed:', err));
            }

            return NextResponse.json({
                success: true,
                response: 'お疲れさまでした！プロフィールを保存しました。続きはいつでも再開できます。',
                sessionId: session.id,
                sessionStatus: 'paused'
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
        const history = session.messages.map(m => ({
            role: m.role,
            content: m.content
        }));

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

            // 信頼度に基づいて実行/保留を判断
            const threshold = action.type === 'DELETE' ? 0.95 : 0.85;

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

        // 保留中のアクションがある場合
        if (pendingActions.length > 0) {
            finalResponse += '\n\n（確認が必要な更新があります。「はい」で実行します）';
        }

        // メッセージ保存
        await prisma.healthChatMessage.createMany({
            data: [
                { sessionId: session.id, role: 'user', content: userMessage },
                { sessionId: session.id, role: 'assistant', content: finalResponse }
            ]
        });

        // アクションが実行された場合、バックグラウンドでGoogle Docs同期
        if (executedActions.length > 0) {
            const allSections = await prisma.healthProfileSection.findMany({
                where: { userId: user.id },
                orderBy: { orderIndex: 'asc' }
            });

            syncHealthProfileToGoogleDocs(
                allSections.map(s => ({
                    categoryId: s.categoryId,
                    title: s.title,
                    content: s.content,
                    orderIndex: s.orderIndex
                }))
            ).catch(err => console.error('Google Docs sync failed:', err));
        }

        return NextResponse.json({
            success: true,
            response: finalResponse,
            sessionId: session.id,
            sessionStatus: 'active',
            executedActions,
            pendingActions,
            detectedIssues,
            followUpTopic
        });

    } catch (error) {
        console.error('Health chat v2 error:', error);
        return NextResponse.json(
            { error: 'チャット処理に失敗しました' },
            { status: 500 }
        );
    }
}
