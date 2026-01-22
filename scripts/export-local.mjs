import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
    }
  }
});

async function exportData() {
  const data = {};
  
  data.users = await prisma.user.findMany();
  data.accounts = await prisma.account.findMany();
  data.sessions = await prisma.session.findMany();
  data.healthRecords = await prisma.healthRecord.findMany();
  data.fitData = await prisma.fitData.findMany();
  data.userHealthItemSettings = await prisma.userHealthItemSetting.findMany();
  data.lifestyleHabits = await prisma.lifestyleHabit.findMany();
  data.supplements = await prisma.supplement.findMany();
  data.inspectionItems = await prisma.inspectionItem.findMany();
  data.healthProfileSections = await prisma.healthProfileSection.findMany();
  data.fitbitAccounts = await prisma.fitbitAccount.findMany();
  data.hrvData = await prisma.hrvData.findMany();
  data.detailedSleep = await prisma.detailedSleep.findMany();
  data.intradayHeartRate = await prisma.intradayHeartRate.findMany();
  data.googleDocsSettings = await prisma.googleDocsSettings.findMany();

  fs.writeFileSync('backups/local_export.json', JSON.stringify(data, null, 2));
  console.log('Local data exported');
  
  console.log('\nLocal DB summary:');
  for (const [table, records] of Object.entries(data)) {
    console.log(`  ${table}: ${records.length} records`);
  }

  await prisma.$disconnect();
}

exportData().catch(console.error);
