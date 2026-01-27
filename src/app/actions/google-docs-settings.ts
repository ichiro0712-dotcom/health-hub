'use server';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// デフォルトのドキュメントID
const DEFAULT_RECORDS_DOC_ID = '1qCYtdo40Adk_-cG8vcwPkwlPW6NKHq97zeIX-EB0F3Y';
const DEFAULT_PROFILE_DOC_ID = '1sHZtZpcFE3Gv8IT8AZZftk3xnCCOUcVwfkC9NuzRanA';

export interface GoogleDocsSettingsData {
    recordsDocId: string | null;
    recordsHeaderText: string | null;
    profileDocId: string | null;
    profileHeaderText: string | null;
    autoSyncEnabled: boolean;
}

// 設定を取得
export async function getGoogleDocsSettings(): Promise<{
    success: boolean;
    data?: GoogleDocsSettingsData;
    error?: string;
}> {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return { success: false, error: 'Unauthorized' };
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { googleDocsSettings: true }
        });

        if (!user) {
            return { success: false, error: 'User not found' };
        }

        const settings = user.googleDocsSettings;

        return {
            success: true,
            data: {
                recordsDocId: settings?.recordsDocId || DEFAULT_RECORDS_DOC_ID,
                recordsHeaderText: settings?.recordsHeaderText || null,
                profileDocId: settings?.profileDocId || DEFAULT_PROFILE_DOC_ID,
                profileHeaderText: settings?.profileHeaderText || null,
                autoSyncEnabled: settings?.autoSyncEnabled ?? true,
            }
        };
    } catch (error) {
        console.error('Failed to get Google Docs settings:', error);
        return { success: false, error: 'Failed to fetch settings' };
    }
}

// 設定を保存
export async function saveGoogleDocsSettings(data: {
    recordsHeaderText?: string | null;
    profileHeaderText?: string | null;
    autoSyncEnabled?: boolean;
}): Promise<{ success: boolean; error?: string }> {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return { success: false, error: 'Unauthorized' };
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email }
        });

        if (!user) {
            return { success: false, error: 'User not found' };
        }

        await prisma.googleDocsSettings.upsert({
            where: { userId: user.id },
            update: {
                recordsDocId: DEFAULT_RECORDS_DOC_ID,
                recordsHeaderText: data.recordsHeaderText,
                profileDocId: DEFAULT_PROFILE_DOC_ID,
                profileHeaderText: data.profileHeaderText,
                autoSyncEnabled: data.autoSyncEnabled ?? true,
            },
            create: {
                userId: user.id,
                recordsDocId: DEFAULT_RECORDS_DOC_ID,
                recordsHeaderText: data.recordsHeaderText,
                profileDocId: DEFAULT_PROFILE_DOC_ID,
                profileHeaderText: data.profileHeaderText,
                autoSyncEnabled: data.autoSyncEnabled ?? true,
            }
        });

        return { success: true };
    } catch (error) {
        console.error('Failed to save Google Docs settings:', error);
        return { success: false, error: 'Failed to save settings' };
    }
}

// 今すぐ同期を実行
export async function triggerGoogleDocsSync(): Promise<{ success: boolean; error?: string }> {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email) {
            return { success: false, error: 'Unauthorized' };
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            include: { googleDocsSettings: true }
        });

        if (!user) {
            return { success: false, error: 'User not found' };
        }

        // 動的インポートでgoogle-docsモジュールを読み込み
        const { syncRecordsToGoogleDocs, syncHealthProfileToGoogleDocs } = await import('@/lib/google-docs');

        // 記録を同期
        const records = await prisma.healthRecord.findMany({
            where: { userId: user.id },
            orderBy: { date: 'desc' },
            select: {
                id: true,
                date: true,
                title: true,
                summary: true,
                data: true,
                additional_data: true
            }
        });

        const recordsResult = await syncRecordsToGoogleDocs(
            records,
            user.googleDocsSettings?.recordsHeaderText || undefined
        );

        // 健康プロフィールを同期
        const sections = await prisma.healthProfileSection.findMany({
            where: { userId: user.id },
            orderBy: { orderIndex: 'asc' }
        });

        const profileResult = await syncHealthProfileToGoogleDocs(
            sections.map(s => ({
                categoryId: s.categoryId,
                title: s.title,
                content: s.content,
                orderIndex: s.orderIndex
            })),
            user.googleDocsSettings?.profileHeaderText || undefined
        );

        if (!recordsResult.success || !profileResult.success) {
            const errors: string[] = [];
            if (!recordsResult.success) errors.push(`Records: ${recordsResult.error || 'unknown'}`);
            if (!profileResult.success) errors.push(`Profile: ${profileResult.error || 'unknown'}`);
            return { success: false, error: errors.join('; ') };
        }

        return { success: true };
    } catch (error) {
        console.error('Failed to trigger sync:', error);
        return { success: false, error: `Sync failed: ${error instanceof Error ? error.message : String(error)}` };
    }
}
