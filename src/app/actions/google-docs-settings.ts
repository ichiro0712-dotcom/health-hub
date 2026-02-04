'use server';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// スマホデータを取得するヘルパー関数
async function getSmartphoneDataForSync(userId: string): Promise<Array<{ date: Date; items: { [key: string]: number } }>> {
    // FitData, HRV, DetailedSleep, IntradayHeartRateを取得
    const [fitDataRecords, hrvRecords, sleepRecords, intradayHrRecords] = await Promise.all([
        prisma.fitData.findMany({
            where: { userId },
            orderBy: { date: 'asc' }
        }),
        prisma.hrvData.findMany({
            where: { userId },
            orderBy: { date: 'asc' }
        }),
        prisma.detailedSleep.findMany({
            where: { userId },
            orderBy: { date: 'asc' }
        }),
        prisma.intradayHeartRate.findMany({
            where: { userId },
            orderBy: { date: 'asc' }
        })
    ]);

    // 日付ごとにデータをマージ
    const dataByDate: { [dateStr: string]: { date: Date; items: { [key: string]: number } } } = {};

    const addItem = (date: Date, key: string, value: number | null | undefined) => {
        if (value === null || value === undefined) return;
        const dateStr = date.toISOString().split('T')[0];
        if (!dataByDate[dateStr]) {
            dataByDate[dateStr] = { date, items: {} };
        }
        dataByDate[dateStr].items[key] = value;
    };

    // FitData
    for (const fit of fitDataRecords) {
        if (fit.weight) addItem(fit.date, '体重', fit.weight);
        if (fit.steps) addItem(fit.date, '歩数', fit.steps);
        if (fit.heartRate) addItem(fit.date, '安静時心拍数', fit.heartRate);
        if (fit.distance) addItem(fit.date, '移動距離', fit.distance);
        if (fit.calories) addItem(fit.date, '消費カロリー', fit.calories);
        if (fit.sleepMinutes) addItem(fit.date, '睡眠時間(分)', fit.sleepMinutes);
        if (fit.respiratoryRate) addItem(fit.date, '呼吸数', fit.respiratoryRate);
        if (fit.skinTemperature) addItem(fit.date, '皮膚温度変化', fit.skinTemperature);

        if (fit.vitals) {
            const v = fit.vitals as any;
            if (v.bloodPressureSystolic) addItem(fit.date, '血圧(上)', v.bloodPressureSystolic);
            if (v.bloodPressureDiastolic) addItem(fit.date, '血圧(下)', v.bloodPressureDiastolic);
            if (v.bodyTemperature) addItem(fit.date, '体温', v.bodyTemperature);
            if (v.oxygenSaturation) addItem(fit.date, '酸素飽和度', v.oxygenSaturation);
        }
    }

    // HRV Data
    for (const hrv of hrvRecords) {
        addItem(hrv.date, 'HRV(RMSSD)', hrv.dailyRmssd);
        if (hrv.deepRmssd) addItem(hrv.date, 'HRV(深睡眠)', hrv.deepRmssd);
    }

    // Detailed Sleep
    for (const sleep of sleepRecords) {
        addItem(sleep.date, '睡眠効率(%)', sleep.efficiency);
        addItem(sleep.date, '覚醒時間(分)', sleep.minutesAwake);
        addItem(sleep.date, '浅い睡眠(分)', sleep.minutesLight);
        addItem(sleep.date, '深い睡眠(分)', sleep.minutesDeep);
        addItem(sleep.date, 'REM睡眠(分)', sleep.minutesRem);
    }

    // Intraday Heart Rate
    for (const ihr of intradayHrRecords) {
        if (ihr.restingHeartRate) addItem(ihr.date, '安静時心拍数', ihr.restingHeartRate);
        addItem(ihr.date, '脂肪燃焼(分)', ihr.fatBurnMinutes);
        addItem(ihr.date, '有酸素運動(分)', ihr.cardioMinutes);
        addItem(ihr.date, 'ピーク運動(分)', ihr.peakMinutes);
    }

    return Object.values(dataByDate);
}

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
        if (!session?.user?.id) {
            return { success: false, error: 'Unauthorized' };
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
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
    recordsDocId?: string | null;
    profileDocId?: string | null;
    recordsHeaderText?: string | null;
    profileHeaderText?: string | null;
    autoSyncEnabled?: boolean;
}): Promise<{ success: boolean; error?: string }> {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return { success: false, error: 'Unauthorized' };
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id }
        });

        if (!user) {
            return { success: false, error: 'User not found' };
        }

        await prisma.googleDocsSettings.upsert({
            where: { userId: user.id },
            update: {
                recordsDocId: data.recordsDocId || DEFAULT_RECORDS_DOC_ID,
                recordsHeaderText: data.recordsHeaderText,
                profileDocId: data.profileDocId || DEFAULT_PROFILE_DOC_ID,
                profileHeaderText: data.profileHeaderText,
                autoSyncEnabled: data.autoSyncEnabled ?? true,
            },
            create: {
                userId: user.id,
                recordsDocId: data.recordsDocId || DEFAULT_RECORDS_DOC_ID,
                recordsHeaderText: data.recordsHeaderText,
                profileDocId: data.profileDocId || DEFAULT_PROFILE_DOC_ID,
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
        if (!session?.user?.id) {
            return { success: false, error: 'Unauthorized' };
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
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

        // 習慣データを取得
        const habits = await prisma.habit.findMany({
            where: { userId: user.id },
            include: {
                records: {
                    orderBy: { date: 'desc' }
                }
            }
        });

        // スマホデータを取得
        const smartphoneData = await getSmartphoneDataForSync(user.id);

        const profileResult = await syncHealthProfileToGoogleDocs(
            sections.map(s => ({
                categoryId: s.categoryId,
                title: s.title,
                content: s.content,
                orderIndex: s.orderIndex
            })),
            user.googleDocsSettings?.profileHeaderText || undefined,
            habits.map(h => ({
                id: h.id,
                name: h.name,
                type: h.type as 'yes_no' | 'numeric',
                unit: h.unit,
                records: h.records.map(r => ({
                    date: r.date,
                    value: r.value
                }))
            })),
            smartphoneData
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
