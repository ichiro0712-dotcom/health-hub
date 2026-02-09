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
import { analyzeProfile } from '@/lib/agents/profile-analyzer';
import { HEALTH_QUESTIONS, getNextQuestion } from '@/constants/health-questions';
import { DEFAULT_PROFILE_CATEGORIES } from '@/constants/health-profile';
import { buildHearingSystemPrompt, parseExtractedData } from '@/lib/agents/hearing-agent';
import { generateProfileActions } from '@/lib/agents/profile-editor';
import type { HearingAgentInput } from '@/lib/agents/types';
import { checkRateLimit } from '@/lib/rate-limit';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

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
        const detection = detectMode(userMessage);
        currentMode = detection.mode;
        // セッションにモードを保存
        await prisma.healthChatSession.update({
            where: { id: session.id },
            data: { mode: currentMode }
        });
    }

    // プロフィールチェック要求を検出
    const isProfileCheckRequest = /プロフィール.{0,4}(チェック|確認|整理|見直し?|診断|点検)|重複.{0,4}(チェック|確認|整理|ない|ある)|矛盾.{0,4}(チェック|確認|整理|ない|ある)|ダブり|ダブって|問題ないか.{0,2}見て|大丈夫[?？]?$/.test(userMessage.trim());

    // プロフィールチェック要求時はAnalyzerを実行して結果を返す
    if (isProfileCheckRequest) {
        const profileResult = await readHealthProfileFromGoogleDocs();
        const profileContent = profileResult.success ? profileResult.content || '' : '';

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

    // issue整理の承認/拒否を検出（フロントから1件のみ送られてくる）
    const hasCurrentIssue = analyzerIssues && Array.isArray(analyzerIssues) && analyzerIssues.length > 0;
    const isIssueConfirmation = hasCurrentIssue
        && /^(はい|うん|OK|オッケー|お願い|実行|やって)/i.test(userMessage.trim());
    const isIssueRejection = hasCurrentIssue
        && /^(いいえ|いや|やめ|キャンセル|だめ|スキップ)/i.test(userMessage.trim());

    // issue承認/拒否時は早期returnし、Geminiストリーミングに流さない
    if (isIssueConfirmation || isIssueRejection) {
        const issueExecutedActions: ProfileAction[] = [];

        // メッセージをDBに保存
        await prisma.healthChatMessage.create({
            data: { sessionId: session.id, role: 'user', content: userMessage }
        });

        if (isIssueConfirmation) {
            const currentIssue = analyzerIssues[0];
            if (currentIssue?.suggestedAction && currentIssue.suggestedAction.type !== 'NONE') {
                const result = await executeProfileAction(user.id, currentIssue.suggestedAction);
                if (result.success) {
                    issueExecutedActions.push(currentIssue.suggestedAction);
                }
            }
            // 実行後にGoogle Docsを同期
            if (issueExecutedActions.length > 0) {
                const allSections = await prisma.healthProfileSection.findMany({
                    where: { userId: user.id },
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
            }
        }

        const responseMsg = isIssueConfirmation
            ? (issueExecutedActions.length > 0 ? '修正を実行しました。' : 'この項目は変更不要でした。')
            : 'スキップしました。';

        await prisma.healthChatMessage.create({
            data: { sessionId: session.id, role: 'assistant', content: responseMsg }
        });

        return createSimpleSSEResponse(responseMsg, {
            sessionId: session.id,
            mode: currentMode,
            executedActions: issueExecutedActions,
            issueProcessed: true,
        });
    }

    // モードに応じてコンテキストを取得し、システムプロンプトを生成
    let profileContent = '';
    let recordsContent = '';
    let systemPrompt = '';
    let hearingInput: HearingAgentInput | null = null;
    const isProfileBuilding = currentMode === 'profile_building';

    if (isProfileBuilding) {
        // プロフィール構築: ヒアリングエージェントのプロンプトを構築
        const profileResult = await readHealthProfileFromGoogleDocs();
        profileContent = profileResult.success ? profileResult.content || '' : '';

        // session.messagesから直接ユーザーメッセージ数を算出（不要なDBクエリ回避）
        const userMessageCount = session.messages.filter(m => m.role === 'user').length;
        hearingInput = await getHearingContext(
            user.id,
            { currentQuestionId: session.currentQuestionId, currentPriority: session.currentPriority },
            profileContent,
            userMessageCount,
        );

        if (hearingInput) {
            // 会話履歴を設定
            const rawHistory = session.messages.map(m => ({
                role: m.role,
                content: m.content
            }));
            hearingInput.conversationHistory = summarizeHistory(rawHistory);
            // issue承認/拒否は早期returnで処理済みのため、ここに来るのは通常メッセージのみ
            if (analyzerIssues && Array.isArray(analyzerIssues) && analyzerIssues.length > 0) {
                hearingInput.issuesForUser = analyzerIssues;
            }
            systemPrompt = buildHearingSystemPrompt(hearingInput);
        } else {
            // 質問が尽きた場合はフォールバック
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

    // 会話履歴を構築
    const rawHistory = session.messages.map(m => ({
        role: m.role,
        content: m.content
    }));
    const history = summarizeHistory(rawHistory);

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

    // フィルタリングするマーカー名を決定
    const markerName = isProfileBuilding ? 'EXTRACTED_DATA' : 'PROFILE_ACTION';
    const markerStart = `<!--${markerName}`;
    const markerEnd = `${markerName}-->`;

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

                                    // 完全なブロックを除去
                                    const fullBlockRegex = new RegExp(`<!--${markerName}[\\s\\S]*?${markerName}-->`, 'g');
                                    textToProcess = textToProcess.replace(fullBlockRegex, '');

                                    // MODE_SWITCHマーカーも除去
                                    textToProcess = textToProcess.replace(/<!--MODE_SWITCH:\s*\w+\s*-->/g, '');

                                    // ブロック開始が含まれているが終了がない場合
                                    const startIdx = textToProcess.indexOf(markerStart);
                                    if (startIdx !== -1) {
                                        insideMarker = true;
                                        const beforeBlock = textToProcess.substring(0, startIdx);
                                        if (beforeBlock) {
                                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: beforeBlock })}\n\n`));
                                        }
                                        continue;
                                    }

                                    // 部分的な開始マーカーを検出
                                    const partialMarkerIdx = textToProcess.lastIndexOf('<!--');
                                    if (partialMarkerIdx !== -1 && partialMarkerIdx > textToProcess.length - markerStart.length) {
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

                // メッセージを保存
                const { responseText: cleanResponse } = parseExtractedData(fullResponse);
                let finalCleanResponse = cleanResponse
                    .replace(/<!--PROFILE_ACTION[\s\S]*?PROFILE_ACTION-->/g, '')
                    .trim();
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
                    // issue処理は早期returnで対応済みのため、通常ストリームではfalse
                    issueProcessed: false,
                })}\n\n`));

            } catch (error) {
                console.error('Streaming error:', error);
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'ストリーミング中にエラーが発生しました' })}\n\n`));
            } finally {
                controller.close();
            }
        }
    });

    return new Response(stream, { headers: SSE_HEADERS });
}
