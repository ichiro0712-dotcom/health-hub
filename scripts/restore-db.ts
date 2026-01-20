import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

async function restore() {
    const args = process.argv.slice(2);
    const fileArg = args.find(arg => arg.startsWith('--file='));

    if (!fileArg) {
        console.error('Usage: ts-node scripts/restore-db.ts --file=<path-to-backup.json>');
        process.exit(1);
    }

    const filePath = fileArg.split('=')[1];

    try {
        const rawData = await fs.readFile(filePath, 'utf-8');
        const backup = JSON.parse(rawData);

        console.log(`Reading backup from ${filePath}...`);
        console.log('Timestamp:', backup.timestamp);

        // Order matters for Foreign Keys
        // User -> Others
        await prisma.$transaction(async (tx) => {

            // 1. Users - Map old IDs to new IDs for users that already exist
            const userIdMap = new Map<string, string>();
            if (backup.users && backup.users.length > 0) {
                console.log(`Restoring ${backup.users.length} users...`);
                for (const user of backup.users) {
                    // Check if user exists by email
                    const existingUser = user.email ? await tx.user.findUnique({ where: { email: user.email } }) : null;

                    if (existingUser) {
                        // Map old ID to existing ID
                        userIdMap.set(user.id, existingUser.id);
                        console.log(`  User ${user.email} already exists, mapping ID`);
                    } else {
                        // Create new user
                        await tx.user.create({
                            data: {
                                id: user.id,
                                name: user.name,
                                email: user.email,
                                image: user.image,
                                createdAt: new Date(user.createdAt),
                                updatedAt: new Date(user.updatedAt),
                                birthDate: user.birthDate ? new Date(user.birthDate) : null,
                                emailVerified: user.emailVerified ? new Date(user.emailVerified) : null
                            }
                        });
                        userIdMap.set(user.id, user.id);
                    }
                }
            }

            // Helper to get mapped user ID
            const getMappedUserId = (oldId: string) => userIdMap.get(oldId) || oldId;

            // 2. HealthItemSettings
            if (backup.healthItemSettings && backup.healthItemSettings.length > 0) {
                console.log(`Restoring ${backup.healthItemSettings.length} settings...`);
                for (const item of backup.healthItemSettings) {
                    await tx.userHealthItemSetting.upsert({
                        where: { userId_itemName: { userId: item.userId, itemName: item.itemName } },
                        update: { ...item, updatedAt: new Date(item.updatedAt) },
                        create: { ...item, updatedAt: new Date(item.updatedAt) }
                    });
                }
            }

            // 3. HealthRecords
            if (backup.healthRecords && backup.healthRecords.length > 0) {
                console.log(`Restoring ${backup.healthRecords.length} health records...`);
                for (const rec of backup.healthRecords) {
                    const mappedUserId = getMappedUserId(rec.userId);
                    await tx.healthRecord.upsert({
                        where: { id: rec.id },
                        update: {
                            userId: mappedUserId,
                            date: new Date(rec.date),
                            status: rec.status,
                            title: rec.title,
                            summary: rec.summary,
                            data: rec.data,
                            additional_data: rec.additional_data,
                            images: rec.images,
                            createdAt: new Date(rec.createdAt),
                            updatedAt: new Date(rec.updatedAt)
                        },
                        create: {
                            id: rec.id,
                            userId: mappedUserId,
                            date: new Date(rec.date),
                            status: rec.status,
                            title: rec.title,
                            summary: rec.summary,
                            data: rec.data,
                            additional_data: rec.additional_data,
                            images: rec.images,
                            createdAt: new Date(rec.createdAt),
                            updatedAt: new Date(rec.updatedAt)
                        }
                    });
                }
            }

            // 4. FitData (Smartphone Data)
            if (backup.fitData && backup.fitData.length > 0) {
                console.log(`Restoring ${backup.fitData.length} fit data records...`);
                for (const f of backup.fitData) {
                    const mappedUserId = getMappedUserId(f.userId);
                    await tx.fitData.upsert({
                        where: { userId_date: { userId: mappedUserId, date: new Date(f.date) } },
                        update: {
                            heartRate: f.heartRate,
                            steps: f.steps,
                            weight: f.weight,
                            raw: f.raw,
                            distance: f.distance,
                            calories: f.calories,
                            sleepMinutes: f.sleepMinutes,
                            sleepData: f.sleepData,
                            vitals: f.vitals,
                            workouts: f.workouts,
                            source: f.source,
                            fitbitSyncId: f.fitbitSyncId,
                            respiratoryRate: f.respiratoryRate,
                            skinTemperature: f.skinTemperature,
                            syncedAt: f.syncedAt ? new Date(f.syncedAt) : new Date()
                        },
                        create: {
                            id: f.id,
                            userId: mappedUserId,
                            date: new Date(f.date),
                            heartRate: f.heartRate,
                            steps: f.steps,
                            weight: f.weight,
                            raw: f.raw,
                            distance: f.distance,
                            calories: f.calories,
                            sleepMinutes: f.sleepMinutes,
                            sleepData: f.sleepData,
                            vitals: f.vitals,
                            workouts: f.workouts,
                            source: f.source,
                            fitbitSyncId: f.fitbitSyncId,
                            respiratoryRate: f.respiratoryRate,
                            skinTemperature: f.skinTemperature,
                            syncedAt: f.syncedAt ? new Date(f.syncedAt) : new Date()
                        }
                    });
                }
            }

            // 5. Supplements
            if (backup.supplements && backup.supplements.length > 0) {
                console.log(`Restoring ${backup.supplements.length} supplements...`);
                for (const s of backup.supplements) {
                    const mappedUserId = getMappedUserId(s.userId);
                    await tx.supplement.upsert({
                        where: { id: s.id },
                        update: {
                            userId: mappedUserId,
                            name: s.name,
                            timing: s.timing,
                            order: s.order,
                            amount: s.amount,
                            unit: s.unit,
                            manufacturer: s.manufacturer,
                            note: s.note,
                            startDate: s.startDate ? new Date(s.startDate) : null,
                            pausedPeriods: s.pausedPeriods,
                            createdAt: new Date(s.createdAt),
                            updatedAt: new Date(s.updatedAt)
                        },
                        create: {
                            id: s.id,
                            userId: mappedUserId,
                            name: s.name,
                            timing: s.timing,
                            order: s.order,
                            amount: s.amount,
                            unit: s.unit,
                            manufacturer: s.manufacturer,
                            note: s.note,
                            startDate: s.startDate ? new Date(s.startDate) : null,
                            pausedPeriods: s.pausedPeriods,
                            createdAt: new Date(s.createdAt),
                            updatedAt: new Date(s.updatedAt)
                        }
                    });
                }
            }

            // 6. Lifestyle Habits
            if (backup.lifestyleHabits || backup.habits) {
                const habits = backup.lifestyleHabits || backup.habits || [];
                if (habits.length > 0) {
                    console.log(`Restoring ${habits.length} habits...`);
                    for (const h of habits) {
                        const mappedUserId = getMappedUserId(h.userId);
                        await tx.lifestyleHabit.upsert({
                            where: { id: h.id },
                            update: {
                                userId: mappedUserId,
                                category: h.category,
                                name: h.name,
                                value: h.value,
                                createdAt: new Date(h.createdAt),
                                updatedAt: new Date(h.updatedAt)
                            },
                            create: {
                                id: h.id,
                                userId: mappedUserId,
                                category: h.category,
                                name: h.name,
                                value: h.value,
                                createdAt: new Date(h.createdAt),
                                updatedAt: new Date(h.updatedAt)
                            }
                        });
                    }
                }
            }

            // 7. Inspection Items (Master/Merge)
            if (backup.inspectionItems && backup.inspectionItems.length > 0) {
                console.log(`Restoring ${backup.inspectionItems.length} inspection items...`);
                for (const i of backup.inspectionItems) {
                    const mappedUserId = getMappedUserId(i.userId);
                    await tx.inspectionItem.upsert({
                        where: { id: i.id },
                        update: {
                            userId: mappedUserId,
                            name: i.name,
                            masterItemCode: i.masterItemCode,
                            createdAt: new Date(i.createdAt),
                            updatedAt: new Date(i.updatedAt)
                        },
                        create: {
                            id: i.id,
                            userId: mappedUserId,
                            name: i.name,
                            masterItemCode: i.masterItemCode,
                            createdAt: new Date(i.createdAt),
                            updatedAt: new Date(i.updatedAt)
                        }
                    });
                }
            }

        });

        console.log('Restore completed successfully!');

    } catch (error) {
        console.error('Restore failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

restore();
