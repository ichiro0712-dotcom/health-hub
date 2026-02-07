/**
 * 健康プロフィール AIチャット v2
 *
 * アーキテクチャ: Google Docsを信頼できる情報源として使用
 * - チャット開始時にGoogle Docsから全プロフィールを読み込み
 * - AIが全コンテキストを把握した上で対話
 * - 重複検出・解決をAIが自律的に実行
 * - モード別システムプロンプト対応
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from '@/lib/prisma';
import { DEFAULT_PROFILE_CATEGORIES } from '@/constants/health-profile';
import { HEALTH_QUESTIONS, getNextQuestion } from '@/constants/health-questions';
import {
    readHealthProfileFromGoogleDocs,
    readRecordsFromGoogleDocs,
    syncHealthProfileToGoogleDocs
} from '@/lib/google-docs';
import {
    type ChatMode,
    type ProfileAction,
    type DetectedIssue,
    detectMode,
    detectModeSwitch,
    stripModeSwitch,
    buildSystemPrompt,
    sanitizeUserInput,
    summarizeHistory,
    executeProfileAction,
    updateQuestionProgress,
    getAnsweredQuestionIds,
    CONFIDENCE_THRESHOLD_DEFAULT,
    CONFIDENCE_THRESHOLD_DELETE,
} from '@/lib/chat-prompts';
import { buildHearingSystemPrompt, parseExtractedData } from '@/lib/agents/hearing-agent';
import { generateProfileActions } from '@/lib/agents/profile-editor';
import type { HearingAgentInput } from '@/lib/agents/types';

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
// 型定義（route.ts固有）
// ============================================

interface ParsedAIResponse {
    responseText: string;
    actions: ProfileAction[];
    detectedIssues: DetectedIssue[];
    followUpTopic?: string;
    answeredQuestionId?: string | null;
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

    // MODE_SWITCHマーカーも除去
    responseText = stripModeSwitch(responseText);

    let actions: ProfileAction[] = [];
    let detectedIssues: DetectedIssue[] = [];
    let followUpTopic: string | undefined;
    let answeredQuestionId: string | null = null;

    if (actionMatch) {
        try {
            const parsed = JSON.parse(actionMatch[1]);
            actions = parsed.actions || [];
            detectedIssues = parsed.detected_issues || [];
            followUpTopic = parsed.follow_up_topic;
            answeredQuestionId = parsed.answered_question_id || null;
        } catch (e) {
            console.error('Failed to parse PROFILE_ACTION:', e);
        }
    }

    return { responseText, actions, detectedIssues, followUpTopic, answeredQuestionId };
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
        const { message, sessionId, pendingActionsToExecute, analyzerIssues } = await req.json();

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

        // issue整理の承認検出
        const hasAnalyzerIssues = analyzerIssues && Array.isArray(analyzerIssues) && analyzerIssues.length > 0;

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
                mode: session.mode,
                sessionStatus: 'active',
                executedActions,
                pendingActions: [],
                syncStatus: syncResult.success ? 'synced' : 'failed',
                syncError: syncResult.error
            });
        }

        // issue整理の承認処理（analyzerIssuesのsuggestedActionを実行）
        if (hasAnalyzerIssues && isConfirmation && !(pendingActionsToExecute && pendingActionsToExecute.length > 0)) {
            const executedActions: ProfileAction[] = [];

            for (const issue of analyzerIssues) {
                if (issue.suggestedAction && issue.suggestedAction.type !== 'NONE') {
                    const result = await executeProfileAction(user.id, issue.suggestedAction);
                    if (result.success) {
                        executedActions.push(issue.suggestedAction);
                    }
                }
            }

            const syncResult = await syncToGoogleDocsWithNotification(user.id);

            const confirmResponse = executedActions.length > 0
                ? `✅ プロフィールの重複・矛盾を${executedActions.length}件整理しました。\n\nそれでは、プロフィールの続きを進めますね。`
                : 'プロフィールの整理は不要でした。続きを進めますね。';

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
                mode: session.mode,
                sessionStatus: 'active',
                executedActions,
                pendingActions: [],
                syncStatus: syncResult.success ? 'synced' : 'failed',
                syncError: syncResult.error
            });
        }

        // issue整理の拒否処理
        if (hasAnalyzerIssues && isRejection && !(pendingActionsToExecute && pendingActionsToExecute.length > 0)) {
            const rejectResponse = '了解しました。そのまま進めますね。';

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
                mode: session.mode,
                sessionStatus: 'active',
                executedActions: [],
                pendingActions: []
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
                mode: session.mode,
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
                mode: session.mode,
                sessionStatus: 'paused',
                syncStatus: syncResult.success ? 'synced' : 'failed',
                syncError: syncResult.error
            });
        }

        // モード判定: セッションにモードがなければ初回メッセージから検出
        let currentMode: ChatMode;
        if (session.mode) {
            currentMode = session.mode as ChatMode;
        } else {
            const detection = detectMode(userMessage);
            currentMode = detection.mode;
            // セッションにモードを保存
            await prisma.healthChatSession.update({
                where: { id: session.id },
                data: { mode: currentMode }
            });
        }

        // モードに応じてコンテキストを取得し、システムプロンプトを生成
        let profileContent = '';
        let recordsContent = '';
        let systemPrompt = '';
        const isProfileBuilding = currentMode === 'profile_building';

        if (isProfileBuilding) {
            // プロフィール構築: ヒアリングエージェントのプロンプトを構築
            const profileResult = await readHealthProfileFromGoogleDocs();
            profileContent = profileResult.success ? profileResult.content || '' : '';

            const answeredIds = await getAnsweredQuestionIds(user.id);
            const currentPriority = (session.currentPriority || 3) as 3 | 2 | 1;

            // 現在の質問を取得
            let currentQuestion = session.currentQuestionId
                ? HEALTH_QUESTIONS.find(q => q.id === session.currentQuestionId)
                : null;

            if (!currentQuestion || answeredIds.includes(currentQuestion.id)) {
                currentQuestion = getNextQuestion(answeredIds, currentPriority) || null;
            }

            if (currentQuestion) {
                // 該当セクションの既存情報のみ抽出
                const sectionTitle = DEFAULT_PROFILE_CATEGORIES.find(
                    c => c.id === currentQuestion.sectionId
                )?.title || '';

                let sectionContent = '';
                if (profileContent) {
                    const regex = new RegExp(
                        `【[^】]*${sectionTitle.replace(/^\d+\.\s*/, '').substring(0, 4)}[^】]*】\\s*([\\s\\S]*?)(?=【|$)`
                    );
                    const match = profileContent.match(regex);
                    if (match && match[1]) {
                        sectionContent = match[1].trim();
                    }
                }

                const messageCount = session.messages.filter(m => m.role === 'user').length;
                const rawHistory = session.messages.map(m => ({ role: m.role, content: m.content }));

                const hearingInput: HearingAgentInput = {
                    currentQuestion: {
                        id: currentQuestion.id,
                        question: currentQuestion.question,
                        sectionId: currentQuestion.sectionId,
                        intent: currentQuestion.intent,
                        extractionHints: currentQuestion.extractionHints,
                    },
                    existingSectionContent: sectionContent,
                    conversationHistory: summarizeHistory(rawHistory),
                    isFirstQuestion: messageCount === 0,
                    issuesForUser: analyzerIssues && Array.isArray(analyzerIssues) && analyzerIssues.length > 0
                        ? analyzerIssues
                        : undefined,
                };

                systemPrompt = buildHearingSystemPrompt(hearingInput);
            } else {
                // 質問が尽きた場合
                systemPrompt = buildSystemPrompt({
                    mode: currentMode,
                    profileContent,
                    recordsContent: '',
                });
            }
        } else if (currentMode === 'data_analysis') {
            const [profileResult, recordsResult] = await Promise.all([
                readHealthProfileFromGoogleDocs(),
                readRecordsFromGoogleDocs()
            ]);
            profileContent = profileResult.success ? profileResult.content || '' : '';
            recordsContent = recordsResult.success ? recordsResult.content || '' : '';
            systemPrompt = buildSystemPrompt({
                mode: currentMode,
                profileContent,
                recordsContent,
            });
        } else {
            // help モード
            systemPrompt = buildSystemPrompt({
                mode: currentMode,
                profileContent: '',
                recordsContent: '',
            });
        }

        // 会話履歴を構築（サマリー化対応）
        const rawHistory = session.messages.map(m => ({
            role: m.role,
            content: m.content
        }));
        const history = summarizeHistory(rawHistory);

        // AI呼び出し
        const aiResponse = await callGeminiAPI(systemPrompt, history, userMessage);

        // MODE_SWITCH検出 → セッションのモードを更新
        const newMode = detectModeSwitch(aiResponse);
        let updatedMode = currentMode;
        if (newMode && newMode !== currentMode) {
            await prisma.healthChatSession.update({
                where: { id: session.id },
                data: { mode: newMode }
            });
            updatedMode = newMode;
        }

        // アクション処理
        const executedActions: ProfileAction[] = [];
        const pendingActions: ProfileAction[] = [];
        const detectedIssues: DetectedIssue[] = [];
        let followUpTopic: string | undefined;

        if (isProfileBuilding) {
            // 3エージェントパイプライン: EXTRACTED_DATAをパースしてProfile Editorに渡す
            const { extractedData } = parseExtractedData(aiResponse);

            if (extractedData && extractedData.extractedFacts.length > 0 && !extractedData.isSkipped && !extractedData.needsClarification) {
                // Stage 3: Profile Editor AI
                const sectionTitle = DEFAULT_PROFILE_CATEGORIES.find(
                    c => c.id === extractedData.sectionId
                )?.title || '';

                const existingSection = await prisma.healthProfileSection.findUnique({
                    where: { userId_categoryId: { userId: user.id, categoryId: extractedData.sectionId } }
                });

                const editorResult = await generateProfileActions({
                    extractedData,
                    existingSectionContent: existingSection?.content || '',
                    sectionId: extractedData.sectionId,
                    sectionTitle,
                });

                for (const action of editorResult.actions) {
                    if (action.type === 'NONE') continue;
                    const threshold = action.type === 'DELETE' ? CONFIDENCE_THRESHOLD_DELETE : CONFIDENCE_THRESHOLD_DEFAULT;
                    if (action.confidence >= threshold) {
                        const result = await executeProfileAction(user.id, action);
                        if (result.success) executedActions.push(action);
                    } else {
                        pendingActions.push(action);
                    }
                }

                if (editorResult.answeredQuestionId) {
                    try {
                        await updateQuestionProgress(user.id, session.id, editorResult.answeredQuestionId);
                    } catch (e) {
                        console.error('Failed to update question progress:', e);
                    }
                }
            } else if (extractedData?.isSkipped && extractedData.questionId) {
                try {
                    await updateQuestionProgress(user.id, session.id, extractedData.questionId);
                } catch (e) {
                    console.error('Failed to update skipped question progress:', e);
                }
            }
        } else {
            // data_analysis / helpモード: 従来のPROFILE_ACTION解析（これらのモードでは出力されないが念のため）
            const parsed = parseAIResponse(aiResponse);
            followUpTopic = parsed.followUpTopic;
        }

        // 最終レスポンス構築
        const { responseText } = parseExtractedData(aiResponse);
        let finalResponse = responseText
            .replace(/<!--PROFILE_ACTION[\s\S]*?PROFILE_ACTION-->/g, '')
            .trim();
        finalResponse = stripModeSwitch(finalResponse);

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
            mode: updatedMode,
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
