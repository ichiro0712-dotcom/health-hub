/**
 * プロフィール分析API（手動トリガー）
 *
 * POST: Profile Analyzerを実行して重複・矛盾を検出
 */

import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import prisma from '@/lib/prisma';
import { getAnsweredQuestionIds } from '@/lib/chat-prompts';
import { analyzeProfile } from '@/lib/agents/profile-analyzer';
import { readHealthProfileFromGoogleDocs } from '@/lib/google-docs';

export async function POST(req: NextRequest) {
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

        const answeredIds = await getAnsweredQuestionIds(user.id);
        const profileResult = await readHealthProfileFromGoogleDocs();
        const profileContent = profileResult.success ? profileResult.content || '' : '';

        if (profileContent.length < 20) {
            return NextResponse.json({
                success: true,
                analyzerResult: { issues: [], missingQuestions: [] }
            });
        }

        const analyzerResult = await analyzeProfile({
            profileContent,
            answeredQuestionIds: answeredIds,
        });

        console.log(`[Analyze] Result: ${analyzerResult.issues.length} issues, ${analyzerResult.missingQuestions.length} missing questions`);

        return NextResponse.json({
            success: true,
            analyzerResult,
        });

    } catch (error) {
        console.error('Analyze API error:', error);
        return NextResponse.json(
            { error: 'プロフィール分析に失敗しました' },
            { status: 500 }
        );
    }
}
