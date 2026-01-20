'use server';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { DEFAULT_PROFILE_CATEGORIES, HealthProfileSectionData } from "@/constants/health-profile";

// ユーザーIDを取得するヘルパー
async function getUserId(): Promise<string | null> {
    const session = await getServerSession(authOptions);
    const userEmail = session?.user?.email;

    if (userEmail) {
        const user = await prisma.user.findUnique({
            where: { email: userEmail },
            select: { id: true }
        });
        if (user) return user.id;
    }

    return null;
}

// 全セクションを取得
export async function getHealthProfile(): Promise<{
    success: boolean;
    data?: HealthProfileSectionData[];
    error?: string;
}> {
    try {
        const userId = await getUserId();
        if (!userId) return { success: false, error: 'Unauthorized' };

        const sections = await prisma.healthProfileSection.findMany({
            where: { userId },
            orderBy: { orderIndex: 'asc' }
        });

        // デフォルトカテゴリとマージ
        const result: HealthProfileSectionData[] = DEFAULT_PROFILE_CATEGORIES.map(cat => {
            const existing = sections.find(s => s.categoryId === cat.id);
            return {
                id: existing?.id,
                categoryId: cat.id,
                title: cat.title,
                content: existing?.content || '',
                orderIndex: cat.order
            };
        });

        // ユーザーが追加したカスタムカテゴリ
        const customSections = sections.filter(
            s => !DEFAULT_PROFILE_CATEGORIES.find(c => c.id === s.categoryId)
        );
        customSections.forEach(s => {
            result.push({
                id: s.id,
                categoryId: s.categoryId,
                title: s.title,
                content: s.content,
                orderIndex: s.orderIndex
            });
        });

        // 順序でソート
        result.sort((a, b) => a.orderIndex - b.orderIndex);

        return { success: true, data: result };
    } catch (error) {
        console.error('Failed to get health profile:', error);
        return { success: false, error: 'Failed to fetch profile' };
    }
}

// セクションを保存（作成または更新）
export async function saveHealthProfileSection(
    categoryId: string,
    title: string,
    content: string,
    orderIndex: number
): Promise<{ success: boolean; error?: string }> {
    try {
        const userId = await getUserId();
        if (!userId) return { success: false, error: 'Unauthorized' };

        await prisma.healthProfileSection.upsert({
            where: {
                userId_categoryId: { userId, categoryId }
            },
            update: {
                title,
                content,
                orderIndex
            },
            create: {
                userId,
                categoryId,
                title,
                content,
                orderIndex
            }
        });

        return { success: true };
    } catch (error) {
        console.error('Failed to save section:', error);
        return { success: false, error: 'Failed to save' };
    }
}

// 複数セクションを一括保存
export async function saveAllHealthProfileSections(
    sections: { categoryId: string; title: string; content: string; orderIndex: number }[]
): Promise<{ success: boolean; error?: string }> {
    try {
        const userId = await getUserId();
        if (!userId) return { success: false, error: 'Unauthorized' };

        // トランザクションで一括保存
        await prisma.$transaction(
            sections.map(section =>
                prisma.healthProfileSection.upsert({
                    where: {
                        userId_categoryId: { userId, categoryId: section.categoryId }
                    },
                    update: {
                        title: section.title,
                        content: section.content,
                        orderIndex: section.orderIndex
                    },
                    create: {
                        userId,
                        categoryId: section.categoryId,
                        title: section.title,
                        content: section.content,
                        orderIndex: section.orderIndex
                    }
                })
            )
        );

        return { success: true };
    } catch (error) {
        console.error('Failed to save sections:', error);
        return { success: false, error: 'Failed to save' };
    }
}

// 新しいカテゴリを追加
export async function addCustomCategory(
    title: string
): Promise<{ success: boolean; categoryId?: string; error?: string }> {
    try {
        const userId = await getUserId();
        if (!userId) return { success: false, error: 'Unauthorized' };

        // 現在の最大orderIndexを取得
        const maxOrder = await prisma.healthProfileSection.findFirst({
            where: { userId },
            orderBy: { orderIndex: 'desc' },
            select: { orderIndex: true }
        });

        const newOrderIndex = (maxOrder?.orderIndex || DEFAULT_PROFILE_CATEGORIES.length) + 1;
        const categoryId = `custom_${Date.now()}`;

        await prisma.healthProfileSection.create({
            data: {
                userId,
                categoryId,
                title,
                content: '',
                orderIndex: newOrderIndex
            }
        });

        return { success: true, categoryId };
    } catch (error) {
        console.error('Failed to add category:', error);
        return { success: false, error: 'Failed to add category' };
    }
}

// カテゴリを削除
export async function deleteCategory(
    categoryId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const userId = await getUserId();
        if (!userId) return { success: false, error: 'Unauthorized' };

        // デフォルトカテゴリは削除不可（内容のみクリア）
        const isDefault = DEFAULT_PROFILE_CATEGORIES.find(c => c.id === categoryId);
        if (isDefault) {
            await prisma.healthProfileSection.updateMany({
                where: { userId, categoryId },
                data: { content: '' }
            });
        } else {
            await prisma.healthProfileSection.deleteMany({
                where: { userId, categoryId }
            });
        }

        return { success: true };
    } catch (error) {
        console.error('Failed to delete category:', error);
        return { success: false, error: 'Failed to delete' };
    }
}

// 全プロフィールをテキストでエクスポート
export async function exportHealthProfileAsText(): Promise<{
    success: boolean;
    text?: string;
    error?: string;
}> {
    try {
        const result = await getHealthProfile();
        if (!result.success || !result.data) {
            return { success: false, error: result.error };
        }

        const lines: string[] = [];
        lines.push('【健康プロフィール】');
        lines.push(`出力日時: ${new Date().toLocaleString('ja-JP')}`);
        lines.push('');

        result.data.forEach(section => {
            if (section.content.trim()) {
                lines.push(`【${section.title}】`);
                lines.push(section.content);
                lines.push('');
            }
        });

        return { success: true, text: lines.join('\n') };
    } catch (error) {
        console.error('Failed to export:', error);
        return { success: false, error: 'Failed to export' };
    }
}
