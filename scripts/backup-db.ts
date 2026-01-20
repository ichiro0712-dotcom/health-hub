
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting full database backup...');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(process.cwd(), 'backup');

    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir);
    }

    const backupFile = path.join(backupDir, `full_backup_${timestamp}.json`);

    try {
        const users = await prisma.user.findMany();
        const healthRecords = await prisma.healthRecord.findMany();
        const fitData = await prisma.fitData.findMany();
        const supplements = await prisma.supplement.findMany();
        const habits = await prisma.lifestyleHabit.findMany();
        const inspectionItems = await prisma.inspectionItem.findMany();
        const userSettings = await prisma.userHealthItemSetting.findMany();
        const accounts = await prisma.account.findMany();

        const data = {
            metadata: {
                timestamp: new Date().toISOString(),
                version: '1.0'
            },
            users,
            accounts,
            healthRecords,
            fitData,
            supplements,
            habits,
            inspectionItems,
            userSettings
        };

        fs.writeFileSync(backupFile, JSON.stringify(data, null, 2));
        console.log(`✅ Backup created successfully at: ${backupFile}`);
        console.log(`Stats:`);
        console.log(`- Users: ${users.length}`);
        console.log(`- HealthRecords: ${healthRecords.length}`);
        console.log(`- FitData: ${fitData.length}`);
        console.log(`- Supplements: ${supplements.length}`);
        console.log(`- Habits: ${habits.length}`);

    } catch (error) {
        console.error('❌ Backup failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
