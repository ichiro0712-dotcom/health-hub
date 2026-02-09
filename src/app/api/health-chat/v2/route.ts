/**
 * 健康プロフィール AIチャット v2 - 非ストリーミングAPI（専用処理のみ）
 *
 * pendingActions承認/拒否、analyzerIssue承認/拒否、終了リクエストのみを処理。
 * 通常のAI会話はすべて stream/route.ts に統一。
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from '@/lib/prisma';
import {
    syncHealthProfileToGoogleDocs
} from '@/lib/google-docs';
import {
    type ProfileAction,
    sanitizeUserInput,
    executeProfileAction,
} from '@/lib/chat-prompts';
import { checkRateLimit } from '@/lib/rate-limit';

const ERROR_CODES = {
    CHAT_001: { code: 'CHAT_001', message: '認証されていません', status: 401 },
    CHAT_002: { code: 'CHAT_002', message: 'ユーザーが見つかりません', status: 404 },
    CHAT_004: { code: 'CHAT_004', message: 'メッセージが必要です', status: 400 },
    CHAT_005: { code: 'CHAT_005', message: 'メッセージが長すぎます（5000文字以内）', status: 400 },
    CHAT_007: { code: 'CHAT_007', message: 'レート制限を超えました。しばらく待ってから再試行してください', status: 429 },
    CHAT_008: { code: 'CHAT_008', message: 'Google Docs同期に失敗しました', status: 500 },
    CHAT_009: { code: 'CHAT_009', message: 'チャット処理に失敗しました', status: 500 },
} as const;

// ============================================
// Google Docs同期
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

        // リクエストボディ
        const { message, sessionId, pendingActionsToExecute } = await req.json();

        if (!message || typeof message !== 'string' || !message.trim()) {
            return NextResponse.json(ERROR_CODES.CHAT_004, { status: ERROR_CODES.CHAT_004.status });
        }

        if (message.length > 5000) {
            return NextResponse.json(ERROR_CODES.CHAT_005, { status: ERROR_CODES.CHAT_005.status });
        }

        const userMessage = sanitizeUserInput(message);

        // セッション取得
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

        // 確認応答の検出
        const isConfirmation = /^(はい|うん|OK|オッケー|お願い|実行|やって)/i.test(userMessage.trim());
        const isRejection = /^(いいえ|いや|やめ|キャンセル|だめ|スキップ)/i.test(userMessage.trim());

        // 終了リクエストの検出
        const isEndRequest = /ここまで保存|保存して|終わり|やめ|中断/.test(userMessage);

        // ============================================
        // pendingActionsの承認
        // ============================================
        if (pendingActionsToExecute && pendingActionsToExecute.length > 0 && isConfirmation) {
            const executedActions: ProfileAction[] = [];

            for (const action of pendingActionsToExecute as ProfileAction[]) {
                const result = await executeProfileAction(user.id, action);
                if (result.success) {
                    executedActions.push(action);
                }
            }

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

        // pendingActionsの拒否
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

        // ============================================
        // analyzerIssueの処理はstream/route.tsのAIストリーミングに統一
        // （自然言語で承認/拒否/カスタム修正を処理）
        // ============================================

        // ============================================
        // 終了リクエスト
        // ============================================
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

        // ============================================
        // 上記のいずれにも該当しない場合はstream/route.tsを使うようフロントに案内
        // ============================================
        return NextResponse.json({
            success: false,
            error: 'この操作にはストリーミングAPIを使用してください',
            redirectToStream: true,
        }, { status: 400 });

    } catch (error) {
        console.error('Health chat v2 error:', error);
        return NextResponse.json(
            { ...ERROR_CODES.CHAT_009, details: error instanceof Error ? error.message : 'Unknown error' },
            { status: ERROR_CODES.CHAT_009.status }
        );
    }
}
