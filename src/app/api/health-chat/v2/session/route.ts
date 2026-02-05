/**
 * 健康プロフィール AIチャット v2 - セッション管理API
 *
 * GET: セッション状態を取得、または新規セッションを開始（高速・楽観的）
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
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

        // 既存のアクティブ/一時停止セッションを探す
        let session = await prisma.healthChatSession.findFirst({
            where: {
                userId: user.id,
                status: { in: ['active', 'paused'] }
            },
            orderBy: { updatedAt: 'desc' },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' },
                    take: 50  // 直近50件
                }
            }
        });

        // DBからプロフィールセクション数をチェック（高速）
        const profileSectionCount = await prisma.healthProfileSection.count({
            where: { userId: user.id }
        });
        const hasProfile = profileSectionCount > 0;

        // ウェルカムメッセージを生成
        let welcomeMessage: string;

        if (session && session.messages.length > 0) {
            // 既存セッションを再開
            welcomeMessage = session.status === 'paused'
                ? 'お帰りなさい！前回の続きから再開しましょう。何か話したいことはありますか？'
                : '続きをお話しください。';
        } else {
            // 新規セッション
            if (hasProfile) {
                welcomeMessage = `こんにちは！健康プロフィールを拝見しました。

プロフィールの更新や、健康に関するご相談がありましたらお気軽にどうぞ。
例えば：
・「最近の生活習慣の変化」を教えていただく
・「プロフィールの○○を修正したい」
・「健康診断の結果について相談したい」

何でもお話しください！`;
            } else {
                welcomeMessage = `はじめまして！健康プロフィールを作成するお手伝いをします。

まずは簡単なところから始めましょう。
生年月日や身長・体重など、基本的な情報から教えていただけますか？

もちろん、話しやすい内容からで構いません！`;
            }

            // 新規セッションを作成
            session = await prisma.healthChatSession.create({
                data: {
                    userId: user.id,
                    status: 'active',
                    currentPriority: 3,
                },
                include: { messages: { orderBy: { createdAt: 'asc' } } }
            });

            // ウェルカムメッセージを保存
            await prisma.healthChatMessage.create({
                data: {
                    sessionId: session.id,
                    role: 'assistant',
                    content: welcomeMessage
                }
            });
        }

        return NextResponse.json({
            success: true,
            sessionId: session.id,
            status: session.status,
            welcomeMessage,
            messages: session.messages.map(m => ({
                id: m.id,
                role: m.role,
                content: m.content,
                createdAt: m.createdAt
            })),
            context: {
                hasProfile,
                hasRecords: false,  // 同期時に確認
                profileSummary: hasProfile ? 'プロフィールあり' : null,
                synced: false  // まだ同期していない
            }
        });

    } catch (error) {
        console.error('Session API error:', error);
        return NextResponse.json(
            { error: 'セッション情報の取得に失敗しました' },
            { status: 500 }
        );
    }
}

/**
 * POST: Google Docsデータを同期（手動トリガー）
 */
import {
    readHealthProfileFromGoogleDocs,
    readRecordsFromGoogleDocs
} from '@/lib/google-docs';

export async function POST(req: NextRequest) {
    try {
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
        if (!token?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Google Docsからプロフィールを読み取り
        const [profileResult, recordsResult] = await Promise.all([
            readHealthProfileFromGoogleDocs(),
            readRecordsFromGoogleDocs()
        ]);

        const hasProfile = profileResult.success && profileResult.content && profileResult.content.length > 100;
        const hasRecords = recordsResult.success && recordsResult.content && recordsResult.content.length > 100;

        // プロフィールのサマリーを生成
        let profileSummary: string | null = null;
        if (profileResult.content) {
            const sectionMatches = profileResult.content.match(/【[^】]+】/g);
            if (sectionMatches && sectionMatches.length > 0) {
                profileSummary = `記入済み: ${sectionMatches.slice(0, 5).join(', ')}${sectionMatches.length > 5 ? ' 他' : ''}`;
            }
        }

        return NextResponse.json({
            success: true,
            context: {
                hasProfile,
                hasRecords,
                profileSummary,
                profileCharCount: profileResult.content?.length || 0,
                recordsCharCount: recordsResult.content?.length || 0,
                synced: true
            }
        });

    } catch (error) {
        console.error('Sync error:', error);
        return NextResponse.json(
            { error: 'Google Docs同期に失敗しました' },
            { status: 500 }
        );
    }
}

/**
 * DELETE: セッションをクリア（新規セッション開始用）
 */
export async function DELETE(req: NextRequest) {
    try {
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

        // 既存セッションを完了状態にする
        await prisma.healthChatSession.updateMany({
            where: {
                userId: user.id,
                status: { in: ['active', 'paused'] }
            },
            data: { status: 'completed' }
        });

        return NextResponse.json({ success: true, message: 'Session cleared' });

    } catch (error) {
        console.error('Session clear error:', error);
        return NextResponse.json(
            { error: 'セッションのクリアに失敗しました' },
            { status: 500 }
        );
    }
}
