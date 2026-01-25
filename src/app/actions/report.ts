'use server';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { format } from 'date-fns';
import { DEFAULT_PROFILE_CATEGORIES } from "@/constants/health-profile";

// 全データを取得してテキスト形式で出力
export async function getAllDataForExport(): Promise<{
    success: boolean;
    text?: string;
    profileData?: string;
    recordsData?: string;
    userData?: { birthDate: Date | null; name: string | null };
    error?: string;
}> {
    try {
        const session = await getServerSession(authOptions);
        const userEmail = session?.user?.email;

        if (!userEmail) {
            return { success: false, error: 'Unauthorized' };
        }

        const user = await prisma.user.findUnique({
            where: { email: userEmail },
            select: { id: true, birthDate: true, name: true }
        });

        if (!user) {
            return { success: false, error: 'User not found' };
        }

        // 健康プロフィールデータ取得
        const profileSections = await prisma.healthProfileSection.findMany({
            where: { userId: user.id },
            orderBy: { orderIndex: 'asc' }
        });

        // デフォルトカテゴリとマージ
        const mergedSections = DEFAULT_PROFILE_CATEGORIES.map(cat => {
            const existing = profileSections.find(s => s.categoryId === cat.id);
            return {
                categoryId: cat.id,
                title: cat.title,
                content: existing?.content || '',
                orderIndex: cat.order
            };
        });

        // カスタムカテゴリも追加
        const customSections = profileSections.filter(
            s => !DEFAULT_PROFILE_CATEGORIES.find(c => c.id === s.categoryId)
        );
        customSections.forEach(s => {
            mergedSections.push({
                categoryId: s.categoryId,
                title: s.title,
                content: s.content,
                orderIndex: s.orderIndex
            });
        });

        // 健康プロフィールテキスト生成
        const profileLines: string[] = [];
        profileLines.push('【健康プロフィール】');
        profileLines.push(`出力日時: ${new Date().toLocaleString('ja-JP')}`);
        profileLines.push('');

        mergedSections.forEach(section => {
            if (section.content.trim()) {
                profileLines.push(`【${section.title}】`);
                profileLines.push(section.content);
                profileLines.push('');
            }
        });

        const profileData = profileLines.join('\n');

        // 診断記録データ取得
        const records = await prisma.healthRecord.findMany({
            where: { userId: user.id },
            orderBy: { date: 'desc' }
        });

        // 診断記録テキスト生成
        const recordLines: string[] = [];
        recordLines.push(`【全記録データ】（${records.length}件）`);
        recordLines.push(`出力日時: ${format(new Date(), 'yyyy/MM/dd HH:mm')}`);
        recordLines.push('━'.repeat(30));
        recordLines.push('');

        records.forEach((record, index) => {
            if (index > 0) {
                recordLines.push('');
                recordLines.push('─'.repeat(30));
                recordLines.push('');
            }

            const meta = (record.additional_data as any) || {};
            const results = (record.data as any)?.results || (Array.isArray(record.data) ? record.data : []);

            recordLines.push(`＜${format(new Date(record.date), 'yyyy/MM/dd')} 診断ファイル詳細＞`);
            if (record.title) recordLines.push(`タイトル: ${record.title}`);
            if (meta.hospitalName) recordLines.push(`病院名: ${meta.hospitalName}`);
            if (record.summary) recordLines.push(`要点: ${record.summary}`);
            recordLines.push('');

            if (results.length > 0) {
                recordLines.push(`[検査結果]`);
                results.forEach((item: any) => {
                    const name = item.item || item.name || '';
                    const value = item.value || '';
                    const unit = item.unit || '';
                    const evaluation = item.evaluation || '';
                    const evalStr = evaluation ? ` (${evaluation})` : '';
                    const unitStr = unit ? ` ${unit}` : '';
                    recordLines.push(`${name}: ${value}${unitStr}${evalStr}`);
                });
                recordLines.push('');
            }

            const sections = meta.sections || [];
            if (sections.length > 0) {
                sections.forEach((sec: any) => {
                    if (sec.title || sec.content) {
                        recordLines.push(`[${sec.title || 'メモ'}]`);
                        if (sec.content) recordLines.push(sec.content);
                        recordLines.push('');
                    }
                });
            }
        });

        const recordsData = recordLines.join('\n');

        // 全データを結合
        const fullText = `${profileData}\n\n${'═'.repeat(40)}\n\n${recordsData}`;

        return {
            success: true,
            text: fullText,
            profileData,
            recordsData,
            userData: { birthDate: user.birthDate, name: user.name }
        };
    } catch (error) {
        console.error('Failed to export data:', error);
        return { success: false, error: 'Failed to export data' };
    }
}

// AI分析用の構造化データを取得
export async function getStructuredDataForAnalysis(emailParam?: string): Promise<{
    success: boolean;
    data?: {
        user: { birthDate: Date | null; name: string | null; age: number | null };
        profile: { categoryId: string; title: string; content: string }[];
        records: {
            date: string;
            title: string | null;
            summary: string | null;
            hospitalName: string | null;
            results: { item: string; value: string; unit: string; evaluation: string }[];
        }[];
        latestRecord: any | null;
    };
    error?: string;
}> {
    try {
        // emailParamが渡されていればそれを使用、なければセッションから取得
        let userEmail = emailParam;

        if (!userEmail) {
            const session = await getServerSession(authOptions);
            userEmail = session?.user?.email;
        }

        if (!userEmail) {
            return { success: false, error: 'Unauthorized' };
        }

        const user = await prisma.user.findUnique({
            where: { email: userEmail },
            select: { id: true, birthDate: true, name: true }
        });

        if (!user) {
            return { success: false, error: 'User not found' };
        }

        // 年齢計算
        let age: number | null = null;
        if (user.birthDate) {
            const today = new Date();
            age = today.getFullYear() - user.birthDate.getFullYear();
            const m = today.getMonth() - user.birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < user.birthDate.getDate())) {
                age--;
            }
        }

        // 健康プロフィールデータ
        const profileSections = await prisma.healthProfileSection.findMany({
            where: { userId: user.id },
            orderBy: { orderIndex: 'asc' }
        });

        const profile = profileSections
            .filter(s => s.content.trim())
            .map(s => ({
                categoryId: s.categoryId,
                title: s.title,
                content: s.content
            }));

        // 診断記録データ
        const healthRecords = await prisma.healthRecord.findMany({
            where: { userId: user.id },
            orderBy: { date: 'desc' },
            take: 10 // 直近10件
        });

        const records = healthRecords.map(record => {
            const meta = (record.additional_data as any) || {};
            const results = (record.data as any)?.results || (Array.isArray(record.data) ? record.data : []);

            return {
                date: format(new Date(record.date), 'yyyy/MM/dd'),
                title: record.title,
                summary: record.summary,
                hospitalName: meta.hospitalName || null,
                results: results.map((item: any) => ({
                    item: item.item || item.name || '',
                    value: String(item.value || ''),
                    unit: item.unit || '',
                    evaluation: item.evaluation || ''
                }))
            };
        });

        return {
            success: true,
            data: {
                user: { birthDate: user.birthDate, name: user.name, age },
                profile,
                records,
                latestRecord: records[0] || null
            }
        };
    } catch (error) {
        console.error('Failed to get structured data:', error);
        return { success: false, error: 'Failed to get data' };
    }
}
