/**
 * Fitbit Data Sync Service
 *
 * Fetches data from Fitbit API and saves to database
 */

import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Prisma JSON型に変換するヘルパー
const toJson = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
import {
  getActivitySummary,
  getHeartRate,
  getHrvRange,
  getSleepRange,
  getBreathingRateRange,
  getTemperatureRange,
  getWeightRange,
  isFitbitConnected,
} from './client';
import {
  FitbitSyncOptions,
  FitbitSyncResult,
  FitbitDataType,
  FitbitSleepLog,
} from './types';

const DEFAULT_SYNC_DAYS = 7;

/**
 * Get date range for sync
 */
function getDateRange(options: FitbitSyncOptions): { startDate: Date; endDate: Date } {
  const endDate = options.endDate || new Date();
  const startDate = options.startDate || new Date(endDate.getTime() - DEFAULT_SYNC_DAYS * 24 * 60 * 60 * 1000);
  return { startDate, endDate };
}

/**
 * Format date to Date object at start of day (UTC)
 */
function toDateOnly(date: Date | string): Date {
  const d = new Date(date);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

/**
 * Sync all Fitbit data for user
 */
export async function syncFitbitData(
  userId: string,
  options: FitbitSyncOptions = {}
): Promise<FitbitSyncResult> {
  const errors: FitbitSyncResult['errors'] = [];
  const data: FitbitSyncResult['data'] = {};
  const syncedAt = new Date();

  // Check if connected
  if (!(await isFitbitConnected(userId))) {
    return {
      success: false,
      syncedAt,
      data: {},
      errors: [{ type: 'activity', message: 'Fitbit not connected' }],
    };
  }

  const { startDate, endDate } = getDateRange(options);
  const dataTypes = options.dataTypes || [
    'activity',
    'heartrate',
    'hrv',
    'sleep',
    'breathing',
    'temperature',
    'weight',
  ];

  // Sync each data type
  for (const dataType of dataTypes) {
    try {
      switch (dataType) {
        case 'activity':
          await syncActivityData(userId, startDate, endDate);
          break;
        case 'heartrate':
          await syncHeartRateData(userId, startDate, endDate);
          break;
        case 'hrv':
          await syncHrvData(userId, startDate, endDate);
          break;
        case 'sleep':
          await syncSleepData(userId, startDate, endDate);
          break;
        case 'breathing':
          await syncBreathingData(userId, startDate, endDate);
          break;
        case 'temperature':
          await syncTemperatureData(userId, startDate, endDate);
          break;
        case 'weight':
          await syncWeightData(userId, startDate, endDate);
          break;
      }
    } catch (error) {
      console.error(`Error syncing ${dataType}:`, error);
      errors.push({
        type: dataType as FitbitDataType,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    success: errors.length === 0,
    syncedAt,
    data,
    errors,
  };
}

/**
 * Sync activity/steps data
 */
async function syncActivityData(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<void> {
  // Iterate through each day
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    try {
      const activity = await getActivitySummary(userId, currentDate);
      const dateOnly = toDateOnly(currentDate);

      // Upsert to FitData
      await prisma.fitData.upsert({
        where: {
          userId_date: { userId, date: dateOnly },
        },
        update: {
          steps: activity.summary.steps,
          calories: activity.summary.activityCalories,
          distance: activity.summary.distances.find(d => d.activity === 'total')?.distance || 0,
          source: 'fitbit',
          syncedAt: new Date(),
        },
        create: {
          userId,
          date: dateOnly,
          steps: activity.summary.steps,
          calories: activity.summary.activityCalories,
          distance: activity.summary.distances.find(d => d.activity === 'total')?.distance || 0,
          source: 'fitbit',
        },
      });
    } catch (error) {
      // Skip individual day errors
      console.error(`Activity sync error for ${currentDate}:`, error);
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }
}

/**
 * Sync heart rate intraday data
 */
async function syncHeartRateData(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<void> {
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    try {
      const hrData = await getHeartRate(userId, currentDate, '1min');
      const dateOnly = toDateOnly(currentDate);

      if (hrData['activities-heart']?.[0]) {
        const dayData = hrData['activities-heart'][0].value;

        // Save intraday data
        if (hrData['activities-heart-intraday']?.dataset) {
          await prisma.intradayHeartRate.upsert({
            where: {
              userId_date: { userId, date: dateOnly },
            },
            update: {
              restingHeartRate: dayData.restingHeartRate || null,
              outOfRangeMinutes: dayData.heartRateZones.find(z => z.name === 'Out of Range')?.minutes || 0,
              fatBurnMinutes: dayData.heartRateZones.find(z => z.name === 'Fat Burn')?.minutes || 0,
              cardioMinutes: dayData.heartRateZones.find(z => z.name === 'Cardio')?.minutes || 0,
              peakMinutes: dayData.heartRateZones.find(z => z.name === 'Peak')?.minutes || 0,
              intradayData: toJson(hrData['activities-heart-intraday'].dataset),
              raw: toJson(hrData),
              syncedAt: new Date(),
            },
            create: {
              userId,
              date: dateOnly,
              restingHeartRate: dayData.restingHeartRate || null,
              outOfRangeMinutes: dayData.heartRateZones.find(z => z.name === 'Out of Range')?.minutes || 0,
              fatBurnMinutes: dayData.heartRateZones.find(z => z.name === 'Fat Burn')?.minutes || 0,
              cardioMinutes: dayData.heartRateZones.find(z => z.name === 'Cardio')?.minutes || 0,
              peakMinutes: dayData.heartRateZones.find(z => z.name === 'Peak')?.minutes || 0,
              intradayData: toJson(hrData['activities-heart-intraday'].dataset),
              raw: toJson(hrData),
            },
          });
        }

        // Also update average heart rate in FitData
        if (dayData.restingHeartRate) {
          await prisma.fitData.upsert({
            where: {
              userId_date: { userId, date: dateOnly },
            },
            update: {
              heartRate: dayData.restingHeartRate,
              source: 'fitbit',
              syncedAt: new Date(),
            },
            create: {
              userId,
              date: dateOnly,
              heartRate: dayData.restingHeartRate,
              source: 'fitbit',
            },
          });
        }
      }
    } catch (error) {
      console.error(`Heart rate sync error for ${currentDate}:`, error);
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }
}

/**
 * Sync HRV data
 */
async function syncHrvData(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<void> {
  try {
    const hrvData = await getHrvRange(userId, startDate, endDate);

    for (const hrv of hrvData.hrv || []) {
      const dateOnly = toDateOnly(hrv.dateTime);

      await prisma.hrvData.upsert({
        where: {
          userId_date: { userId, date: dateOnly },
        },
        update: {
          dailyRmssd: hrv.value.dailyRmssd,
          deepRmssd: hrv.value.deepRmssd || null,
          raw: toJson(hrv),
          syncedAt: new Date(),
        },
        create: {
          userId,
          date: dateOnly,
          dailyRmssd: hrv.value.dailyRmssd,
          deepRmssd: hrv.value.deepRmssd || null,
          raw: toJson(hrv),
        },
      });
    }
  } catch (error) {
    console.error('HRV sync error:', error);
    throw error;
  }
}

/**
 * Sync sleep data with stages
 */
async function syncSleepData(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<void> {
  try {
    const sleepData = await getSleepRange(userId, startDate, endDate);

    for (const sleep of sleepData.sleep || []) {
      const dateOnly = toDateOnly(sleep.dateOfSleep);

      // Save detailed sleep data
      await prisma.detailedSleep.upsert({
        where: {
          userId_logId: { userId, logId: String(sleep.logId) },
        },
        update: {
          date: dateOnly,
          startTime: new Date(sleep.startTime),
          endTime: new Date(sleep.endTime),
          duration: sleep.minutesAsleep,
          efficiency: sleep.efficiency,
          minutesAwake: sleep.minutesAwake,
          minutesLight: getSleepStageMinutes(sleep, 'light'),
          minutesDeep: getSleepStageMinutes(sleep, 'deep'),
          minutesRem: getSleepStageMinutes(sleep, 'rem'),
          stages: toJson(sleep.levels.data),
          raw: toJson(sleep),
          syncedAt: new Date(),
        },
        create: {
          userId,
          logId: String(sleep.logId),
          date: dateOnly,
          startTime: new Date(sleep.startTime),
          endTime: new Date(sleep.endTime),
          duration: sleep.minutesAsleep,
          efficiency: sleep.efficiency,
          minutesAwake: sleep.minutesAwake,
          minutesLight: getSleepStageMinutes(sleep, 'light'),
          minutesDeep: getSleepStageMinutes(sleep, 'deep'),
          minutesRem: getSleepStageMinutes(sleep, 'rem'),
          stages: toJson(sleep.levels.data),
          raw: toJson(sleep),
        },
      });

      // Also update sleep minutes in FitData (main sleep only)
      if (sleep.isMainSleep) {
        await prisma.fitData.upsert({
          where: {
            userId_date: { userId, date: dateOnly },
          },
          update: {
            sleepMinutes: sleep.minutesAsleep,
            sleepData: toJson(sleep),
            source: 'fitbit',
            syncedAt: new Date(),
          },
          create: {
            userId,
            date: dateOnly,
            sleepMinutes: sleep.minutesAsleep,
            sleepData: toJson(sleep),
            source: 'fitbit',
          },
        });
      }
    }
  } catch (error) {
    console.error('Sleep sync error:', error);
    throw error;
  }
}

/**
 * Get sleep stage minutes from sleep log
 */
function getSleepStageMinutes(sleep: FitbitSleepLog, stage: 'light' | 'deep' | 'rem' | 'wake'): number {
  if (sleep.type === 'stages' && sleep.levels.summary) {
    return sleep.levels.summary[stage]?.minutes || 0;
  }
  return 0;
}

/**
 * Sync breathing rate data
 */
async function syncBreathingData(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<void> {
  try {
    const brData = await getBreathingRateRange(userId, startDate, endDate);

    for (const br of brData.br || []) {
      const dateOnly = toDateOnly(br.dateTime);

      await prisma.fitData.upsert({
        where: {
          userId_date: { userId, date: dateOnly },
        },
        update: {
          respiratoryRate: br.value.breathingRate,
          source: 'fitbit',
          syncedAt: new Date(),
        },
        create: {
          userId,
          date: dateOnly,
          respiratoryRate: br.value.breathingRate,
          source: 'fitbit',
        },
      });
    }
  } catch (error) {
    console.error('Breathing rate sync error:', error);
    throw error;
  }
}

/**
 * Sync skin temperature data
 */
async function syncTemperatureData(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<void> {
  try {
    const tempData = await getTemperatureRange(userId, startDate, endDate);

    for (const temp of tempData.tempSkin || []) {
      const dateOnly = toDateOnly(temp.dateTime);

      await prisma.fitData.upsert({
        where: {
          userId_date: { userId, date: dateOnly },
        },
        update: {
          skinTemperature: temp.value.nightlyRelative,
          source: 'fitbit',
          syncedAt: new Date(),
        },
        create: {
          userId,
          date: dateOnly,
          skinTemperature: temp.value.nightlyRelative,
          source: 'fitbit',
        },
      });
    }
  } catch (error) {
    console.error('Temperature sync error:', error);
    throw error;
  }
}

/**
 * Sync weight data
 */
async function syncWeightData(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<void> {
  try {
    const weightData = await getWeightRange(userId, startDate, endDate);

    for (const weight of weightData.weight || []) {
      const dateOnly = toDateOnly(weight.date);

      // Only update weight if source is Fitbit scale
      // Health Connect weight from other scales takes priority
      const existing = await prisma.fitData.findUnique({
        where: {
          userId_date: { userId, date: dateOnly },
        },
        select: { weight: true, source: true },
      });

      // Don't overwrite Health Connect weight data
      if (existing?.weight && existing.source === 'health_connect') {
        continue;
      }

      await prisma.fitData.upsert({
        where: {
          userId_date: { userId, date: dateOnly },
        },
        update: {
          weight: weight.weight,
          syncedAt: new Date(),
        },
        create: {
          userId,
          date: dateOnly,
          weight: weight.weight,
          source: 'fitbit',
        },
      });
    }
  } catch (error) {
    console.error('Weight sync error:', error);
    throw error;
  }
}
