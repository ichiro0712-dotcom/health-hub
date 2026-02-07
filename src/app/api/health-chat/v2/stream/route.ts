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
import { HEALTH_QUESTIONS, getNextQuestion } from '@/constants/health-questions';
import { DEFAULT_PROFILE_CATEGORIES } from '@/constants/health-profile';
import { buildHearingSystemPrompt, parseExtractedData } from '@/lib/agents/hearing-agent';
import { generateProfileActions } from '@/lib/agents/profile-editor';
import type { HearingAgentInput } from '@/lib/agents/types';

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
// プロフィール構築: 現在の質問とセクション情報を取得
// ============================================

async function getHearingContext(
    userId: string,
    session: { currentQuestionId: string | null; currentPriority: number },
    profileContent: string,
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

    // 会話の長さから初回かどうか判定
    const messageCount = await prisma.healthChatMessage.count({
        where: {
            session: { userId },
            role: 'user',
        }
    });

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
        isFirstQuestion: messageCount === 0,
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
    let hearingInput: HearingAgentInput | null = null;
    const isProfileBuilding = currentMode === 'profile_building';

    if (isProfileBuilding) {
        // プロフィール構築: ヒアリングエージェントのプロンプトを構築
        const profileResult = await readHealthProfileFromGoogleDocs();
        profileContent = profileResult.success ? profileResult.content || '' : '';

        hearingInput = await getHearingContext(
            user.id,
            { currentQuestionId: session.currentQuestionId, currentPriority: session.currentPriority },
            profileContent,
        );

        if (hearingInput) {
            // 会話履歴を設定
            const rawHistory = session.messages.map(m => ({
                role: m.role,
                content: m.content
            }));
            hearingInput.conversationHistory = summarizeHistory(rawHistory);
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
                    temperature: isProfileBuilding ? 0.4 : 0.4,
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
