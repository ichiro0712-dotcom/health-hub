/**
 * 健康プロフィール AIチャット v2 - セッション管理API
 *
 * GET: セッション状態を取得、または新規セッションを開始（高速・楽観的）
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from '@/lib/prisma';
import { DEFAULT_PROFILE_CATEGORIES } from '@/constants/health-profile';

// ============================================
// データ状態の検出
// ============================================

interface DataStatus {
    profileFilledCount: number;
    profileTotalCount: number;
    missingSectionNames: string[];
    hasRecords: boolean;
    hasFitbit: boolean;
    hasGoogleDocs: boolean;
}

async function detectDataStatus(userId: string): Promise<DataStatus> {
    const [profileSections, recordCount, fitbitAccount, googleDocsSettings] = await Promise.all([
        prisma.healthProfileSection.findMany({
            where: { userId },
            select: { categoryId: true, content: true }
        }),
        prisma.healthRecord.count({ where: { userId } }),
        prisma.fitbitAccount.findUnique({ where: { userId } }),
        prisma.googleDocsSettings.findUnique({ where: { userId } }),
    ]);

    // 実際にcontentが入っているセクションのみカウント
    const filledSectionIds = new Set(
        profileSections
            .filter(s => s.content && s.content.trim().length > 0)
            .map(s => s.categoryId)
    );

    const missingSectionNames = DEFAULT_PROFILE_CATEGORIES
        .filter(cat => !filledSectionIds.has(cat.id))
        .map(cat => cat.title.replace(/^\d+\.\s*/, '')); // 番号プレフィックスを除去

    return {
        profileFilledCount: filledSectionIds.size,
        profileTotalCount: DEFAULT_PROFILE_CATEGORIES.length,
        missingSectionNames,
        hasRecords: recordCount > 0,
        hasFitbit: !!fitbitAccount,
        hasGoogleDocs: !!googleDocsSettings,
    };
}

// ============================================
// ウェルカムメッセージの動的生成
// ============================================

function buildWelcomeMessage(status: DataStatus): string {
    const lines: string[] = [];
    let choiceNum = 1;

    // 固定: あいさつ + できること
    lines.push('こんにちは！H-Hubアシスタントです。');
    lines.push('');
    lines.push('私はあなたの健康データの管理をお手伝いします。');
    lines.push('できることは以下です！');
    lines.push('');
    lines.push(`${toFullWidth(choiceNum++)}．健康プロフィールの${status.profileFilledCount > 0 ? '更新' : '作成・更新'}`);
    lines.push(`${toFullWidth(choiceNum++)}．健康診断の結果や記録データの分析・アドバイス`);
    lines.push(`${toFullWidth(choiceNum++)}．Health Hubの使い方サポート`);

    // 動的: データ不足の提案
    const hasProfileGap = status.profileFilledCount < status.profileTotalCount;
    const needsDataInput = !status.hasRecords || hasProfileGap;

    if (needsDataInput) {
        lines.push('');
        if (!status.hasRecords && status.profileFilledCount === 0) {
            lines.push('まだデータが入っていないようですね。');
            lines.push('まずはデータの入力から始めませんか？');
        } else if (!status.hasRecords) {
            lines.push('健康診断の記録がまだ登録されていないようです。');
        } else if (hasProfileGap) {
            // 未入力セクション名を最大3つ表示
            const examples = status.missingSectionNames.slice(0, 3).join('、');
            const suffix = status.missingSectionNames.length > 3 ? 'など' : '';
            lines.push(`健康プロフィールにまだ入力されていない項目があります（${examples}${suffix}）。`);
        }

        lines.push('');
        if (!status.hasRecords) {
            lines.push(`${toFullWidth(choiceNum++)}．健康診断・医療データについて教える`);
        }
        if (hasProfileGap) {
            lines.push(`${toFullWidth(choiceNum++)}．健康プロフィールを${status.profileFilledCount === 0 ? '作成する' : '充実させる'}`);
        }
    }

    // 動的: 連携未設定の提案
    const hasIntegrationGap = !status.hasFitbit || !status.hasGoogleDocs;

    if (hasIntegrationGap) {
        lines.push('');
        lines.push('Health Hubではスマートウォッチやお持ちのAIとの連携もできます。');
        if (!status.hasFitbit && !status.hasGoogleDocs) {
            lines.push('まだ連携していないものがあるようです。');
        }

        lines.push('');
        if (!status.hasFitbit) {
            lines.push(`${toFullWidth(choiceNum++)}．スマートウォッチ・スマホとの連携`);
        }
        if (!status.hasGoogleDocs) {
            lines.push(`${toFullWidth(choiceNum++)}．Gemini・ChatGPTへの健康データ連携`);
        }
    }

    lines.push('');
    lines.push('何から始めますか？番号でもお気軽にどうぞ！');

    return lines.join('\n');
}

function buildResumeMessage(): string {
    return `お帰りなさい！

前回の続きから再開しますか？それとも別のことをしますか？

１．前回の続きから
２．別のことをする`;
}

function toFullWidth(num: number): string {
    const fullWidthDigits = ['０', '１', '２', '３', '４', '５', '６', '７', '８', '９'];
    return String(num).split('').map(d => fullWidthDigits[parseInt(d)]).join('');
}

// ============================================
// GET: セッション取得/新規作成
// ============================================

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

        // データ状態を検出
        const dataStatus = await detectDataStatus(user.id);
        const hasProfile = dataStatus.profileFilledCount > 0;

        // ウェルカムメッセージを生成
        let welcomeMessage: string;

        if (session && session.messages.length > 0) {
            // 既存セッションを再開
            welcomeMessage = buildResumeMessage();
        } else {
            // 新規セッション
            welcomeMessage = buildWelcomeMessage(dataStatus);

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
            mode: session.mode || null,
            welcomeMessage,
            messages: session.messages.map(m => ({
                id: m.id,
                role: m.role,
                content: m.content,
                createdAt: m.createdAt
            })),
            context: {
                hasProfile,
                hasRecords: dataStatus.hasRecords,
                profileSummary: hasProfile
                    ? `${dataStatus.profileFilledCount}/${dataStatus.profileTotalCount}セクション入力済み`
                    : null,
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
