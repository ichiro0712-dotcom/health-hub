/**
 * 健康プロフィール AIチャット v2 - セッション管理API
 *
 * GET: セッション状態を取得、または新規セッションを開始
 * POST: Google Docsデータを同期 + プロフィール分析
 * DELETE: セッションをクリア
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from '@/lib/prisma';
import { DEFAULT_PROFILE_CATEGORIES } from '@/constants/health-profile';
import { getAnsweredQuestionIds } from '@/lib/chat-prompts';
import { analyzeProfile } from '@/lib/agents/profile-analyzer';
import { getNextQuestion } from '@/constants/health-questions';
import {
    readHealthProfileFromGoogleDocs,
    readRecordsFromGoogleDocs
} from '@/lib/google-docs';

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
    const hasProfileGap = status.profileFilledCount < status.profileTotalCount;

    // プロフィール未完成 → メニューなしで即プロフィール構築開始
    if (hasProfileGap) {
        if (status.profileFilledCount === 0) {
            return 'こんにちは！H-Hubアシスタントです。\n\n健康プロフィールを充実させるために質問を進めさせてもらいますね。\n途中で辞めたいときは「ここまで保存して」と言ってください。';
        }
        return 'こんにちは！H-Hubアシスタントです。\n\nプロフィールの内容を確認して、足りないところから質問を進めさせてもらいますね。\n途中で辞めたいときは「ここまで保存して」と言ってください。';
    }

    // プロフィール完成済み → シンプルな3択
    return `こんにちは！H-Hubアシスタントです。\n\n健康プロフィールは充実しています！何をお手伝いしますか？\n\n１．健康プロフィールの更新\n２．健康データの分析・アドバイス\n３．使い方サポート`;
}

function buildResumeMessage(): string {
    return `お帰りなさい！前回の続きから再開しますね。`;
}

/**
 * 1件目のissueをウェルカムメッセージに組み込む（1件ずつ確認方式）
 */
function formatFirstIssueForWelcome(issues: import('@/lib/agents/types').ProfileIssue[]): string {
    if (issues.length === 0) return '';

    const issue = issues[0];
    const typeLabel = { DUPLICATE: '重複', CONFLICT: '矛盾', OUTDATED: '古い情報' } as const;
    const label = typeLabel[issue.type] || issue.type;
    const action = issue.suggestedAction;

    let text = `\n\nプロフィールに**${label}**が見つかりました（1/${issues.length}件）：\n\n`;
    text += `${issue.description}\n\n`;

    if (action && action.type !== 'NONE') {
        if (action.type === 'DELETE') {
            text += `**修正案**: 以下を削除します\n`;
            text += `「${action.target_text}」\n\n`;
        } else if (action.type === 'UPDATE') {
            text += `**修正案**: 以下のように更新します\n`;
            if (action.target_text) {
                text += `変更前: 「${action.target_text}」\n`;
            }
            text += `変更後: 「${action.new_text}」\n\n`;
        }
        text += `こう修正しますか？「はい」で修正、「スキップ」で次へ進みます。`;
    } else {
        text += `→ ${issue.suggestedResolution}`;
    }

    return text;
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
        const hasProfileGap = dataStatus.profileFilledCount < dataStatus.profileTotalCount;

        // ウェルカムメッセージを生成
        let welcomeMessage: string;
        let analyzerResult = null;

        if (session && session.messages.length > 0) {
            // 既存セッションを再開
            welcomeMessage = buildResumeMessage();

            // 既存セッション再開時もプロフィールの重複・矛盾をチェック
            if (hasProfileGap || hasProfile) {
                try {
                    const answeredIds = await getAnsweredQuestionIds(user.id);
                    const profileResult = await readHealthProfileFromGoogleDocs();
                    const profileContent = profileResult.success ? profileResult.content || '' : '';

                    if (profileContent.length >= 20) {
                        analyzerResult = await analyzeProfile({
                            profileContent,
                            answeredQuestionIds: answeredIds,
                        });
                    }
                } catch (error) {
                    console.error('[Session] Resume analyzer failed:', error);
                }
            }
        } else {
            // 新規セッション: プロフィール未完成時はアナライザー実行
            let firstQuestionText = '';

            if (hasProfileGap) {
                try {
                    // プロフィール分析 + 回答済み質問の取得を並行実行
                    const answeredIds = await getAnsweredQuestionIds(user.id);

                    // Google Docsからプロフィールを読み込み
                    const profileResult = await readHealthProfileFromGoogleDocs();
                    const profileContent = profileResult.success ? profileResult.content || '' : '';

                    // アナライザー実行
                    analyzerResult = await analyzeProfile({
                        profileContent,
                        answeredQuestionIds: answeredIds,
                    });

                    console.log(`[Session] Analyzer result: ${analyzerResult.issues.length} issues, ${analyzerResult.missingQuestions.length} missing questions`);

                    // 重複・矛盾がある場合は先に整理提案、なければ最初の質問を取得
                    if (analyzerResult.issues.length > 0) {
                        firstQuestionText = formatFirstIssueForWelcome(analyzerResult.issues);
                    } else if (analyzerResult.missingQuestions.length > 0) {
                        const firstQ = analyzerResult.missingQuestions[0];
                        const sectionTitle = DEFAULT_PROFILE_CATEGORIES.find(
                            c => c.id === firstQ.sectionId
                        )?.title || '';
                        firstQuestionText = `\n\n「${sectionTitle}」について聞かせてください。\n\n${firstQ.question}`;
                    }
                } catch (error) {
                    console.error('[Session] Analyzer failed:', error);
                    // フォールバック: 従来のgetNextQuestionを使用
                    const answeredIds = await getAnsweredQuestionIds(user.id);
                    const nextQ = getNextQuestion(answeredIds, 3);
                    if (nextQ) {
                        const sectionTitle = DEFAULT_PROFILE_CATEGORIES.find(
                            c => c.id === nextQ.sectionId
                        )?.title || '';
                        firstQuestionText = `\n\n「${sectionTitle}」について聞かせてください。\n\n${nextQ.question}`;
                    }
                }
            }

            welcomeMessage = buildWelcomeMessage(dataStatus) + firstQuestionText;

            // 新規セッションを作成（プロフィール未完成時はprofile_buildingモードを即設定）
            session = await prisma.healthChatSession.create({
                data: {
                    userId: user.id,
                    status: 'active',
                    currentPriority: 3,
                    mode: hasProfileGap ? 'profile_building' : null,
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
            analyzerResult,
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
