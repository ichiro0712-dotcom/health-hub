/**
 * 健康プロフィール AIチャット v2 - ストリーミングAPI
 *
 * Server-Sent Events (SSE) を使用してリアルタイムで応答を返す
 * profile_buildingモード: 3エージェントパイプライン（Hearing AI → Profile Editor）
 * data_analysis / helpモード: 従来の単一LLM呼び出し
 */

import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from '@/lib/prisma';
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
    detectModeAsync,
    detectModeSwitch,
    stripModeSwitch,
    buildSystemPrompt,
    buildSystemPromptAsync,
    sanitizeUserInput,
    summarizeHistory,
    summarizeHistoryAsync,
    executeProfileAction,
    updateQuestionProgress,
    getAnsweredQuestionIds,
    getConfidenceThresholdDefault,
    getConfidenceThresholdDelete,
    CONFIDENCE_THRESHOLD_DEFAULT,
    CONFIDENCE_THRESHOLD_DELETE,
} from '@/lib/chat-prompts';
import { logAdminError } from '@/lib/admin-error-log';
import { analyzeProfile } from '@/lib/agents/profile-analyzer';
import { HEALTH_QUESTIONS, getNextQuestion } from '@/constants/health-questions';
import { DEFAULT_PROFILE_CATEGORIES } from '@/constants/health-profile';
import { buildHearingSystemPrompt, buildIssueOnlySystemPrompt, parseExtractedData, parseIssueDecision } from '@/lib/agents/hearing-agent';
import { generateProfileActions } from '@/lib/agents/profile-editor';
import type { HearingAgentInput } from '@/lib/agents/types';
import { checkRateLimit } from '@/lib/rate-limit';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

/**
 * DBからプロフィール内容をテキスト形式で取得（正のデータソース）
 */
async function buildProfileContentFromDB(userId: string): Promise<string> {
    const sections = await prisma.healthProfileSection.findMany({
        where: { userId },
        orderBy: { orderIndex: 'asc' },
    });

    if (sections.length === 0) return '';

    return sections
        .filter(s => s.content.trim())
        .map(s => `【${s.title}】\n${s.content}`)
        .join('\n\n');
}

// ============================================
// SSE共通ヘッダー・ヘルパー
// ============================================

const SSE_HEADERS = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
} as const;

/**
 * 固定メッセージのSSEレスポンスを生成するヘルパー
 */
function createSimpleSSEResponse(
    text: string,
    extras: Record<string, unknown> = {},
): Response {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        start(controller) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, ...extras })}\n\n`));
            controller.close();
        }
    });
    return new Response(stream, { headers: SSE_HEADERS });
}

// ============================================
// プロフィール構築: 現在の質問とセクション情報を取得
// ============================================

async function getHearingContext(
    userId: string,
    session: { currentQuestionId: string | null; currentPriority: number },
    profileContent: string,
    userMessageCount: number,
): Promise<HearingAgentInput | null> {
    const answeredIds = await getAnsweredQuestionIds(userId);
    const currentPriority = (session.currentPriority || 3) as 3 | 2 | 1;

    // 現在の質問を取得
    let currentQuestion = session.currentQuestionId
        ? HEALTH_QUESTIONS.find(q => q.id === session.currentQuestionId)
        : null;

    // currentQuestionIdがない、または既に回答済みなら次の質問を取得
    if (!currentQuestion || answeredIds.includes(currentQuestion.id)) {
        currentQuestion = getNextQuestion(answeredIds, currentPriority) || null;
    }

    if (!currentQuestion) return null;

    // 該当セクションの既存情報のみ抽出
    const sectionTitle = DEFAULT_PROFILE_CATEGORIES.find(
        c => c.id === currentQuestion.sectionId
    )?.title || '';

    let sectionContent = '';
    if (profileContent) {
        // 【セクション名】で囲まれたコンテンツを抽出
        const regex = new RegExp(
            `【[^】]*${sectionTitle.replace(/^\d+\.\s*/, '').substring(0, 4)}[^】]*】\\s*([\\s\\S]*?)(?=【|$)`
        );
        const match = profileContent.match(regex);
        if (match && match[1]) {
            sectionContent = match[1].trim();
        }
    }

    // 次の質問を先読み（自然な会話遷移のため）
    const answeredIdsWithCurrent = [...answeredIds, currentQuestion.id];
    const upcomingQuestion = getNextQuestion(answeredIdsWithCurrent, currentPriority);

    return {
        currentQuestion: {
            id: currentQuestion.id,
            question: currentQuestion.question,
            sectionId: currentQuestion.sectionId,
            intent: currentQuestion.intent,
            extractionHints: currentQuestion.extractionHints,
        },
        existingSectionContent: sectionContent,
        conversationHistory: [], // 呼び出し元で設定
        isFirstQuestion: userMessageCount === 0,
        nextQuestion: upcomingQuestion ? upcomingQuestion.question : undefined,
    };
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

    const { message, sessionId, analyzerIssues } = await req.json();

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

    // モード判定: セッションにモードがなければ初回メッセージから検出
    let currentMode: ChatMode;
    if (session.mode) {
        currentMode = session.mode as ChatMode;
    } else {
        const detection = await detectModeAsync(userMessage);
        currentMode = detection.mode;
        // セッションにモードを保存
        await prisma.healthChatSession.update({
            where: { id: session.id },
            data: { mode: currentMode }
        });
    }

    // プロフィールチェック要求を検出
    const isProfileCheckRequest = /プロフィール.{0,4}(チェック|確認|整理|見直し?|診断|点検)|重複.{0,4}(チェック|確認|整理|ない|ある)|矛盾.{0,4}(チェック|確認|整理|ない|ある)|ダブり|ダブって|問題ないか.{0,2}見て|大丈夫[?？]?$/.test(userMessage.trim());

    // プロフィールチェック要求時はAnalyzerを実行して結果を返す（DBを正のデータソースとして使用）
    if (isProfileCheckRequest) {
        const profileContent = await buildProfileContentFromDB(user.id);

        // メッセージをDBに保存
        await prisma.healthChatMessage.create({
            data: { sessionId: session.id, role: 'user', content: userMessage }
        });

        if (profileContent.length < 20) {
            const noDataMsg = 'プロフィールのデータがまだ少ないため、チェックできません。まずはプロフィールの入力を進めましょう！';
            await prisma.healthChatMessage.create({
                data: { sessionId: session.id, role: 'assistant', content: noDataMsg }
            });
            return createSimpleSSEResponse(noDataMsg, { sessionId: session.id, mode: currentMode });
        }

        const answeredIds = await getAnsweredQuestionIds(user.id);
        const analyzerResult = await analyzeProfile({ profileContent, answeredQuestionIds: answeredIds });

        if (analyzerResult.issues.length > 0) {
            const responseMsg = `プロフィールをチェックしました。${analyzerResult.issues.length}件の整理が必要な箇所が見つかりました。`;
            await prisma.healthChatMessage.create({
                data: { sessionId: session.id, role: 'assistant', content: responseMsg }
            });
            return createSimpleSSEResponse(responseMsg, {
                sessionId: session.id,
                mode: currentMode,
                analyzerIssues: analyzerResult.issues,
            });
        } else {
            const okMsg = 'プロフィールをチェックしました。重複や矛盾は見つかりませんでした！';
            await prisma.healthChatMessage.create({
                data: { sessionId: session.id, role: 'assistant', content: okMsg }
            });
            return createSimpleSSEResponse(okMsg, { sessionId: session.id, mode: currentMode });
        }
    }

    // issue情報はAIストリーミングに渡して自然言語で処理する（早期returnしない）

    // モードに応じてコンテキストを取得し、システムプロンプトを生成
    let profileContent = '';
    let recordsContent = '';
    let systemPrompt = '';
    let hearingInput: HearingAgentInput | null = null;
    const isProfileBuilding = currentMode === 'profile_building';

    if (isProfileBuilding) {
        // プロフィール構築モード
        const hasIssues = analyzerIssues && Array.isArray(analyzerIssues) && analyzerIssues.length > 0;

        if (hasIssues) {
            // issue処理中: 通常質問は聞かず、issue処理のみに集中
            const rawHistory = session.messages.map(m => ({
                role: m.role,
                content: m.content
            }));
            systemPrompt = buildIssueOnlySystemPrompt(analyzerIssues, await summarizeHistoryAsync(rawHistory));
        } else {
            // 通常のヒアリング: 質問を進める（DBを正のデータソースとして使用）
            profileContent = await buildProfileContentFromDB(user.id);

            const userMessageCount = session.messages.filter(m => m.role === 'user').length;
            hearingInput = await getHearingContext(
                user.id,
                { currentQuestionId: session.currentQuestionId, currentPriority: session.currentPriority },
                profileContent,
                userMessageCount,
            );

            if (hearingInput) {
                const rawHistory = session.messages.map(m => ({
                    role: m.role,
                    content: m.content
                }));
                hearingInput.conversationHistory = await summarizeHistoryAsync(rawHistory);
                systemPrompt = buildHearingSystemPrompt(hearingInput);
            } else {
                // 質問が尽きた場合はフォールバック
                systemPrompt = await buildSystemPromptAsync({
                    mode: currentMode,
                    profileContent,
                    recordsContent: '',
                });
            }
        }
    } else if (currentMode === 'data_analysis') {
        const [profileResult, recordsResult] = await Promise.all([
            readHealthProfileFromGoogleDocs(),
            readRecordsFromGoogleDocs()
        ]);
        profileContent = profileResult.success ? profileResult.content || '' : '';
        recordsContent = recordsResult.success ? recordsResult.content || '' : '';
        systemPrompt = await buildSystemPromptAsync({
            mode: currentMode,
            profileContent,
            recordsContent,
        });
    } else {
        // help モード
        systemPrompt = await buildSystemPromptAsync({
            mode: currentMode,
            profileContent: '',
            recordsContent: '',
        });
    }

    // 会話履歴を構築
    const rawHistory = session.messages.map(m => ({
        role: m.role,
        content: m.content
    }));
    const history = await summarizeHistoryAsync(rawHistory);

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
                    temperature: currentMode === 'data_analysis' ? 0.7 : 0.4,
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
    const modeForClosure = currentMode;

    // フィルタリングするマーカー（全内部タグを汎用的に除去）
    // 対象: EXTRACTED_DATA, PROFILE_ACTION, MODE_SWITCH, ISSUE_DECISION, 将来追加されるタグ全て
    const ALL_MARKER_NAMES = ['EXTRACTED_DATA', 'PROFILE_ACTION', 'ISSUE_DECISION', 'MODE_SWITCH'];
    const markerName = isProfileBuilding ? 'EXTRACTED_DATA' : 'PROFILE_ACTION';
    const markerStart = '<!--';
    const markerEnd = '-->';

    const stream = new ReadableStream({
        async start(controller) {
            const reader = geminiResponse.body!.getReader();
            let insideMarker = false;
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

                                    // マーカーブロックのフィルタリング（チャンクまたぎ対応）
                                    let textToProcess = pendingBuffer + text;
                                    pendingBuffer = '';

                                    if (insideMarker) {
                                        const endIdx = textToProcess.indexOf(markerEnd);
                                        if (endIdx !== -1) {
                                            insideMarker = false;
                                            textToProcess = textToProcess.substring(endIdx + markerEnd.length);
                                        } else {
                                            continue;
                                        }
                                    }

                                    // 全内部タグを汎用的に除去（<!--TAG_NAME...TAG_NAME--> 形式）
                                    for (const tag of ALL_MARKER_NAMES) {
                                        const tagRegex = new RegExp(`<!--${tag}[\\s\\S]*?${tag}-->`, 'g');
                                        textToProcess = textToProcess.replace(tagRegex, '');
                                    }
                                    // 1行形式の <!--TAG: value--> も除去
                                    textToProcess = textToProcess.replace(/<!--[A-Z_]+:?\s[^>]*-->/g, '');

                                    // ブロック開始が含まれているが終了がない場合（全タグ対応）
                                    const startIdx = textToProcess.indexOf(markerStart);
                                    if (startIdx !== -1) {
                                        // 内部タグの開始かどうかを判定
                                        const afterStart = textToProcess.substring(startIdx + 4);
                                        const isInternalTag = ALL_MARKER_NAMES.some(tag => afterStart.startsWith(tag)) || /^[A-Z_]+/.test(afterStart);
                                        if (isInternalTag) {
                                            insideMarker = true;
                                            const beforeBlock = textToProcess.substring(0, startIdx);
                                            if (beforeBlock) {
                                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: beforeBlock })}\n\n`));
                                            }
                                            continue;
                                        }
                                    }

                                    // 部分的な開始マーカーを検出（`<!--` が末尾付近にある場合バッファに保持）
                                    const partialMarkerIdx = textToProcess.lastIndexOf('<!--');
                                    if (partialMarkerIdx !== -1 && textToProcess.indexOf('-->', partialMarkerIdx) === -1) {
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

                // バッファに残ったテキストがあれば送信
                if (pendingBuffer && !insideMarker) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: pendingBuffer })}\n\n`));
                }

                // MODE_SWITCH検出 → セッションのモードを更新
                const newMode = detectModeSwitch(fullResponse);
                let updatedMode = modeForClosure;
                if (newMode && newMode !== modeForClosure) {
                    await prisma.healthChatSession.update({
                        where: { id: sessionIdForClosure },
                        data: { mode: newMode }
                    });
                    updatedMode = newMode;
                }

                // アクション処理
                const executedActions: ProfileAction[] = [];
                const pendingActions: ProfileAction[] = [];
                const detectedIssues: DetectedIssue[] = [];

                if (modeForClosure === 'profile_building') {
                    // 3エージェントパイプライン: EXTRACTED_DATAをパースしてProfile Editorに渡す
                    const { extractedData } = parseExtractedData(fullResponse);

                    if (extractedData && extractedData.extractedFacts.length > 0 && !extractedData.isSkipped && !extractedData.needsClarification) {
                        // Stage 3: Profile Editor AI
                        const sectionTitle = DEFAULT_PROFILE_CATEGORIES.find(
                            c => c.id === extractedData.sectionId
                        )?.title || '';

                        // 該当セクションの既存内容を取得
                        const existingSection = await prisma.healthProfileSection.findUnique({
                            where: { userId_categoryId: { userId: userIdForClosure, categoryId: extractedData.sectionId } }
                        });

                        const editorResult = await generateProfileActions({
                            extractedData,
                            existingSectionContent: existingSection?.content || '',
                            sectionId: extractedData.sectionId,
                            sectionTitle,
                        });

                        // アクションを実行
                        for (const action of editorResult.actions) {
                            if (action.type === 'NONE') continue;

                            const [thresholdDefault, thresholdDelete] = await Promise.all([
                                getConfidenceThresholdDefault(),
                                getConfidenceThresholdDelete(),
                            ]);
                            const threshold = action.type === 'DELETE' ? thresholdDelete : thresholdDefault;

                            if (action.confidence >= threshold) {
                                const result = await executeProfileAction(userIdForClosure, action);
                                if (result.success) {
                                    executedActions.push(action);
                                }
                            } else {
                                pendingActions.push(action);
                            }
                        }

                        // 質問進捗を更新
                        if (editorResult.answeredQuestionId) {
                            try {
                                await updateQuestionProgress(
                                    userIdForClosure,
                                    sessionIdForClosure,
                                    editorResult.answeredQuestionId
                                );
                            } catch (e) {
                                console.error('Failed to update question progress:', e);
                            }
                        }
                    } else if (extractedData?.isSkipped && extractedData.questionId) {
                        // スキップの場合も進捗を更新
                        try {
                            await updateQuestionProgress(
                                userIdForClosure,
                                sessionIdForClosure,
                                extractedData.questionId
                            );
                        } catch (e) {
                            console.error('Failed to update skipped question progress:', e);
                        }
                    }
                } else {
                    // data_analysis / helpモード: 従来のPROFILE_ACTIONはこれらのモードでは出力されない
                }

                // ISSUE_DECISION の処理（AIが自然言語で判断した結果）
                const issueDecision = parseIssueDecision(fullResponse);
                let issueProcessed = false;

                if (issueDecision && analyzerIssues && Array.isArray(analyzerIssues) && analyzerIssues.length > 0) {
                    const currentIssue = analyzerIssues[0];
                    issueProcessed = true;

                    if (issueDecision.decision === 'approve') {
                        // 提案通りに修正
                        if (currentIssue?.suggestedAction && currentIssue.suggestedAction.type !== 'NONE') {
                            const result = await executeProfileAction(userIdForClosure, currentIssue.suggestedAction);
                            if (result.success) {
                                executedActions.push(currentIssue.suggestedAction);
                            }
                        }
                    } else if (issueDecision.decision === 'custom' && issueDecision.customAction) {
                        // カスタム修正
                        const customAction: ProfileAction = {
                            type: issueDecision.customAction.type,
                            section_id: issueDecision.customAction.section_id || currentIssue?.suggestedAction?.section_id || '',
                            target_text: issueDecision.customAction.target_text,
                            new_text: issueDecision.customAction.new_text || undefined,
                            reason: issueDecision.customAction.reason,
                            confidence: issueDecision.customAction.confidence,
                        };
                        const result = await executeProfileAction(userIdForClosure, customAction);
                        if (result.success) {
                            executedActions.push(customAction);
                        }
                    } else if (issueDecision.decision === 'clarify') {
                        // 追加説明 → issueは保持（issueProcessedをfalseに戻す）
                        issueProcessed = false;
                    }
                    // reject → 何も実行しない（issueProcessed=trueでフロントが次のissueに進む）
                }

                // メッセージを保存
                const { responseText: cleanResponse } = parseExtractedData(fullResponse);
                let finalCleanResponse = cleanResponse;
                // 全内部タグを除去（DB保存用）
                for (const tag of ALL_MARKER_NAMES) {
                    finalCleanResponse = finalCleanResponse.replace(new RegExp(`<!--${tag}[\\s\\S]*?${tag}-->`, 'g'), '');
                }
                finalCleanResponse = finalCleanResponse.replace(/<!--[A-Z_]+:?\s[^>]*-->/g, '').trim();
                finalCleanResponse = stripModeSwitch(finalCleanResponse);

                await prisma.healthChatMessage.createMany({
                    data: [
                        { sessionId: sessionIdForClosure, role: 'user', content: userMessage },
                        { sessionId: sessionIdForClosure, role: 'assistant', content: finalCleanResponse }
                    ]
                });

                // Google Docs同期（アクション実行時のみ）
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
                    mode: updatedMode,
                    executedActions,
                    pendingActions,
                    detectedIssues,
                    syncStatus,
                    issueProcessed,
                })}\n\n`));

            } catch (error) {
                console.error('Streaming error:', error);
                logAdminError('error', 'api_error', `Chat streaming error: ${error instanceof Error ? error.message : String(error)}`, {
                    endpoint: '/api/health-chat/v2/stream',
                    stack: error instanceof Error ? error.stack : undefined,
                });
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'ストリーミング中にエラーが発生しました' })}\n\n`));
            } finally {
                controller.close();
            }
        }
    });

    return new Response(stream, { headers: SSE_HEADERS });
}
