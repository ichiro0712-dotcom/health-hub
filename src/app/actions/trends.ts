'use server';

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

import { getItemMappings } from "./items";
import { compareItemsByCategory } from "@/lib/master-data/jlac10-subset";

export interface TrendRecord {
    id: string;
    date: string;
    items: { [key: string]: number };
    images: string[];
    notes?: string;
    hospital?: string;
    source?: 'hospital' | 'smartphone';
}

export interface TrendsResponse {
    success: boolean;
    availableKeys: string[];
    records: TrendRecord[];
    error?: string;
}

export async function getTrendsData(): Promise<TrendsResponse> {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, availableKeys: [], records: [], error: "Unauthorized" };

    try {
        const user = await prisma.user.findUnique({ where: { id: session.user.id } });
        if (!user) return { success: false, availableKeys: [], records: [], error: "User not found" };

        // 全クエリを並列実行（パフォーマンス改善: H-20）
        const [
            hospitalRecords,
            fitDataRecords,
            hrvRecords,
            sleepRecords,
            intradayHrRecords,
            mapping
        ] = await Promise.all([
            prisma.healthRecord.findMany({
                where: { userId: user.id, status: 'verified' },
                orderBy: { date: 'asc' }
            }),
            prisma.fitData.findMany({
                where: { userId: user.id },
                orderBy: { date: 'asc' }
            }),
            prisma.hrvData.findMany({
                where: { userId: user.id },
                orderBy: { date: 'asc' }
            }),
            prisma.detailedSleep.findMany({
                where: { userId: user.id },
                orderBy: { date: 'asc' }
            }),
            prisma.intradayHeartRate.findMany({
                where: { userId: user.id },
                orderBy: { date: 'asc' }
            }),
            getItemMappings()
        ]);

        // 1. Unified Dataset Construction
        const keySet = new Set<string>();
        const formattedRecords: TrendRecord[] = [];

        // Process Hospital Records
        for (const record of hospitalRecords) {
            const data = record.data as { results?: Array<{ item?: string; value?: string }>; meta?: { notes?: string; hospitalName?: string } } | null;
            const results = data?.results || [];
            const meta = data?.meta || {};
            const additional = record.additional_data as { notes?: string; hospitalName?: string } | null;

            const itemsMap: { [key: string]: number } = {};

            results.forEach((r: any) => {
                const rawKey = r.item?.trim();
                if (!rawKey) return;

                const displayName = mapping[rawKey] || rawKey;
                const val = parseFloat(r.value);
                if (displayName && !isNaN(val)) {
                    itemsMap[displayName] = val;
                    keySet.add(displayName);
                }
            });

            formattedRecords.push({
                id: record.id,
                date: record.date.toISOString().split('T')[0],
                items: itemsMap,
                images: record.images,
                notes: meta.notes || additional?.notes || undefined,
                hospital: meta.hospitalName || additional?.hospitalName || undefined,
                source: 'hospital' // Tag as Hospital Data
            });
        }

        // Process Smartphone Data - Merge all sources by date
        const smartphoneDataByDate: { [date: string]: { [key: string]: number } } = {};

        // Helper function to add data to date map
        const addToDateMap = (date: Date, key: string, value: number | null | undefined) => {
            if (value === null || value === undefined) return;
            const dateStr = date.toISOString().split('T')[0];
            if (!smartphoneDataByDate[dateStr]) {
                smartphoneDataByDate[dateStr] = {};
            }
            smartphoneDataByDate[dateStr][key] = value;
            keySet.add(key);
        };

        // Process FitData
        for (const fit of fitDataRecords) {
            const dateStr = fit.date.toISOString().split('T')[0];
            if (!smartphoneDataByDate[dateStr]) {
                smartphoneDataByDate[dateStr] = {};
            }

            // Map known fields to display names
            if (fit.weight) addToDateMap(fit.date, '体重', fit.weight);
            if (fit.steps) addToDateMap(fit.date, '歩数', fit.steps);
            if (fit.heartRate) addToDateMap(fit.date, '安静時心拍数', fit.heartRate);
            if (fit.distance) addToDateMap(fit.date, '移動距離', fit.distance);
            if (fit.calories) addToDateMap(fit.date, '消費カロリー', fit.calories);
            if (fit.sleepMinutes) addToDateMap(fit.date, '睡眠時間(分)', fit.sleepMinutes);
            if (fit.respiratoryRate) addToDateMap(fit.date, '呼吸数', fit.respiratoryRate);
            if (fit.skinTemperature) addToDateMap(fit.date, '皮膚温度変化', fit.skinTemperature);

            // Map Vitals if present (Dynamic JSON)
            if (fit.vitals) {
                const v = fit.vitals as any;
                if (v.bloodPressureSystolic) addToDateMap(fit.date, '血圧(上)', v.bloodPressureSystolic);
                if (v.bloodPressureDiastolic) addToDateMap(fit.date, '血圧(下)', v.bloodPressureDiastolic);
                if (v.bodyTemperature) addToDateMap(fit.date, '体温', v.bodyTemperature);
                if (v.oxygenSaturation) addToDateMap(fit.date, '酸素飽和度', v.oxygenSaturation);
            }
        }

        // Process HRV Data
        for (const hrv of hrvRecords) {
            addToDateMap(hrv.date, 'HRV(RMSSD)', hrv.dailyRmssd);
            if (hrv.deepRmssd) addToDateMap(hrv.date, 'HRV(深睡眠)', hrv.deepRmssd);
        }

        // Process Detailed Sleep Data
        for (const sleep of sleepRecords) {
            addToDateMap(sleep.date, '睡眠効率(%)', sleep.efficiency);
            addToDateMap(sleep.date, '覚醒時間(分)', sleep.minutesAwake);
            addToDateMap(sleep.date, '浅い睡眠(分)', sleep.minutesLight);
            addToDateMap(sleep.date, '深い睡眠(分)', sleep.minutesDeep);
            addToDateMap(sleep.date, 'REM睡眠(分)', sleep.minutesRem);
        }

        // Process Intraday Heart Rate Data
        for (const ihr of intradayHrRecords) {
            if (ihr.restingHeartRate) addToDateMap(ihr.date, '安静時心拍数', ihr.restingHeartRate);
            addToDateMap(ihr.date, '脂肪燃焼(分)', ihr.fatBurnMinutes);
            addToDateMap(ihr.date, '有酸素運動(分)', ihr.cardioMinutes);
            addToDateMap(ihr.date, 'ピーク運動(分)', ihr.peakMinutes);
        }

        // Convert merged data to records
        for (const [dateStr, items] of Object.entries(smartphoneDataByDate)) {
            if (Object.keys(items).length > 0) {
                formattedRecords.push({
                    id: `smartphone-${dateStr}`,
                    date: dateStr,
                    items,
                    images: [],
                    source: 'smartphone'
                });
            }
        }

        // Sort merged records by date
        formattedRecords.sort((a, b) => a.date.localeCompare(b.date));

        return {
            success: true,
            availableKeys: Array.from(keySet).sort(compareItemsByCategory),
            records: formattedRecords
        };

    } catch (error) {
        console.error("Trends Data Error:", error);
        return { success: false, availableKeys: [], records: [], error: "Failed to fetch trends" };
    }
}
