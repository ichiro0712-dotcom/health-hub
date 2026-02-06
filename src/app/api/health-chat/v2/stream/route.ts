/**
 * 健康プロフィール AIチャット v2 - ストリーミングAPI
 *
 * Server-Sent Events (SSE) を使用してリアルタイムで応答を返す
 * モード別システムプロンプト対応
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

    // モードに応じてGoogle Docsからコンテキストを取得
    let profileContent = '';
    let recordsContent = '';
    let answeredQuestionIds: string[] = [];

    if (currentMode === 'profile_building') {
        const [profileResult, answeredIds] = await Promise.all([
            readHealthProfileFromGoogleDocs(),
            getAnsweredQuestionIds(user.id)
        ]);
        profileContent = profileResult.success ? profileResult.content || '' : '';
        answeredQuestionIds = answeredIds;
    } else if (currentMode === 'data_analysis') {
        const [profileResult, recordsResult] = await Promise.all([
            readHealthProfileFromGoogleDocs(),
            readRecordsFromGoogleDocs()
        ]);
        profileContent = profileResult.success ? profileResult.content || '' : '';
        recordsContent = recordsResult.success ? recordsResult.content || '' : '';
    }
    // help モードではGoogle Docs読み込み不要

    // 会話履歴を構築
    const rawHistory = session.messages.map(m => ({
        role: m.role,
        content: m.content
    }));
    const history = summarizeHistory(rawHistory);

    // モード別システムプロンプト生成
    const systemPrompt = buildSystemPrompt({
        mode: currentMode,
        profileContent,
        recordsContent,
        answeredQuestionIds,
        currentQuestionId: session.currentQuestionId,
        currentPriority: session.currentPriority,
    });

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
    const modeForClosure = currentMode;

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

                                    // MODE_SWITCHマーカーも除去
                                    textToProcess = textToProcess.replace(/<!--MODE_SWITCH:\s*\w+\s*-->/g, '');

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

                // プロフィール構築モードのみPROFILE_ACTIONを処理
                let actions: ProfileAction[] = [];
                let detectedIssues: DetectedIssue[] = [];
                const executedActions: ProfileAction[] = [];
                const pendingActions: ProfileAction[] = [];

                if (modeForClosure === 'profile_building') {
                    const actionMatch = fullResponse.match(/<!--PROFILE_ACTION\n([\s\S]*?)\nPROFILE_ACTION-->/);
                    let answeredQuestionId: string | null = null;

                    if (actionMatch) {
                        try {
                            const parsed = JSON.parse(actionMatch[1]);
                            actions = parsed.actions || [];
                            detectedIssues = parsed.detected_issues || [];
                            answeredQuestionId = parsed.answered_question_id || null;
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

                    // 質問進捗を更新
                    if (answeredQuestionId) {
                        try {
                            await updateQuestionProgress(
                                userIdForClosure,
                                sessionIdForClosure,
                                answeredQuestionId
                            );
                        } catch (e) {
                            console.error('Failed to update question progress:', e);
                        }
                    }
                }

                // メッセージを保存
                let cleanResponse = fullResponse
                    .replace(/<!--PROFILE_ACTION[\s\S]*?PROFILE_ACTION-->/g, '')
                    .trim();
                cleanResponse = stripModeSwitch(cleanResponse);

                await prisma.healthChatMessage.createMany({
                    data: [
                        { sessionId: sessionIdForClosure, role: 'user', content: userMessage },
                        { sessionId: sessionIdForClosure, role: 'assistant', content: cleanResponse }
                    ]
                });

                // Google Docs同期（プロフィール構築モードでアクション実行時のみ）
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

                // 完了イベントを送信（modeも含める）
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
