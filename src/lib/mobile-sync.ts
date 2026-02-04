import { Capacitor } from '@capacitor/core';
import { HealthConnect } from 'capacitor-health-connect';
import type { RecordType, Record as HealthRecord } from 'capacitor-health-connect';
import toast from 'react-hot-toast';

// Extended types not in the official definition due to patch
type ExtendedRecordType = RecordType | 'Distance' | 'SleepSession';

export async function checkAndSyncHealthConnect() {
    if (!Capacitor.isNativePlatform()) {
        console.log("Not native platform, skipping Health Connect sync");
        return;
    }

    try {
        const availability = await HealthConnect.checkAvailability();
        if (availability.availability !== 'Available') {
            toast.error("ヘルスケアデータが利用できません");
            return false;
        }

        // 1. Request Permissions
        const readTypes: ExtendedRecordType[] = [
            'Steps',
            'Distance',
            'ActiveCaloriesBurned',
            'HeartRateSeries',
            'Weight',
            'SleepSession',
            'BloodPressure',
            'BodyTemperature',
            'OxygenSaturation'
        ];

        let granted;
        try {
            granted = await HealthConnect.requestHealthPermissions({
                read: readTypes as RecordType[],
                write: []
            });
        } catch (permissionError) {
            console.error("HealthConnect Permission Request Failed:", permissionError);
            toast.error("ヘルスケアプリとの連携に失敗しました。設定を確認してください。");
            return false;
        }

        if (!granted || !granted.hasAllPermissions) {
            console.warn("Not all permissions granted", granted);
            toast.error("権限が不足しています。設定から「すべて許可」にしてください。", {
                duration: 5000,
                icon: '⚠️'
            });
            // Try-catch for opening settings as well
            try {
                setTimeout(async () => {
                    await HealthConnect.openHealthConnectSetting();
                }, 1000);
            } catch (e) {
                console.error("Failed to open Health Connect settings", e);
            }
            return false;
        }

        // 2. Loop for Past 7 Days (including today)
        const daysToSync = 7;
        let successCount = 0;

        for (let i = 0; i < daysToSync; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);

            // Start of Day (00:00:00)
            const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);

            // End of Day (23:59:59) OR Now if it's today
            const endOfDay = i === 0 ? new Date() : new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

            // Helper to fetch records
            const fetchRecords = async (type: ExtendedRecordType) => {
                try {
                    const res = await HealthConnect.readRecords({
                        type: type as RecordType,
                        timeRangeFilter: {
                            type: 'between',
                            startTime: startOfDay,
                            endTime: endOfDay
                        },
                        pageSize: 1000
                    });
                    return res.records;
                } catch (e) {
                    console.error(`Failed to fetch ${type} for ${date.toDateString()}`, e);
                    return [];
                }
            };

            // Fetch All Data
            const stepsData = await fetchRecords('Steps');
            console.log(`[${date.toDateString()}] Steps: ${stepsData.length}`);

            const distanceData = await fetchRecords('Distance');

            const caloriesData = await fetchRecords('ActiveCaloriesBurned');

            const heartRateData = await fetchRecords('HeartRateSeries');

            const weightData = await fetchRecords('Weight');

            const sleepData = await fetchRecords('SleepSession');
            console.log(`[${date.toDateString()}] Sleep: ${sleepData.length}`);

            const bpData = await fetchRecords('BloodPressure');
            const tempData = await fetchRecords('BodyTemperature');
            const oxyData = await fetchRecords('OxygenSaturation');

            // Transform Data
            const totalSteps = stepsData.reduce((acc: number, cur: any) => acc + (cur.count || 0), 0);

            const totalDistance = distanceData.reduce((acc: number, cur: any) => {
                return acc + (cur.distance?.value || 0);
            }, 0);

            const totalCalories = caloriesData.reduce((acc: number, cur: any) => {
                return acc + (cur.energy?.value || 0);
            }, 0);

            let avgHeartRate = 0;
            let hrCount = 0;
            heartRateData.forEach((record: any) => {
                if (record.samples) {
                    record.samples.forEach((s: any) => {
                        avgHeartRate += s.beatsPerMinute;
                        hrCount++;
                    });
                }
            });
            if (hrCount > 0) avgHeartRate = Math.round(avgHeartRate / hrCount);

            let weight = 0;
            if (weightData.length > 0) {
                const last = weightData[weightData.length - 1] as any;
                weight = last.weight?.value || 0;
            }

            const totalSleepMinutes = sleepData.reduce((acc: number, cur: any) => {
                const start = new Date(cur.startTime).getTime();
                const end = new Date(cur.endTime).getTime();
                const minutes = (end - start) / (1000 * 60);
                return acc + minutes;
            }, 0);

            try {
                const response = await fetch('/api/v1/health-connect/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        date: startOfDay.toISOString(),
                        data: {
                            steps: totalSteps,
                            distance: totalDistance,
                            calories: totalCalories,
                            heartRate: avgHeartRate,
                            weight: weight,
                            sleepMinutes: totalSleepMinutes,
                            sleepData: sleepData, // Send raw sleep data
                            vitals: { // Send raw vitals data clearly grouped
                                bloodPressure: bpData,
                                bodyTemperature: tempData,
                                oxygenSaturation: oxyData
                            },
                            workouts: []
                        }
                    }),
                });

                if (response.ok) {
                    successCount++;
                }
            } catch (err) {
                console.error(`Sync failed for ${date.toDateString()}`, err);
            }
        }

        if (successCount > 0) {
            toast.success(`過去${successCount}日分のデータを同期しました`);
            return true;
        } else {
            toast.error("同期に失敗しました");
            return false;
        }

    } catch (error) {
        console.error("Health Connect Sync Error:", error);
        toast.error("同期処理中にエラーが発生しました");
        return false;
    }
}
