import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres.tmlwtmqoffgrlpedstns:xI6hSgTGSYJVGWsR1dpSLbpi@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"
    }
  }
});

async function backup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupDir = './backups';
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const data = {};
  
  // Export all tables
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
  
  // Try GoogleDocsSettings (might not exist yet)
  try {
    data.googleDocsSettings = await prisma.googleDocsSettings.findMany();
  } catch (e) {
    console.log('GoogleDocsSettings table does not exist yet');
    data.googleDocsSettings = [];
  }

  const backupFile = path.join(backupDir, `backup_prod_${timestamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(data, null, 2));
  console.log(`Backup saved to ${backupFile}`);
  
  // Count records
  console.log('\nBackup summary:');
  for (const [table, records] of Object.entries(data)) {
    console.log(`  ${table}: ${records.length} records`);
  }

  await prisma.$disconnect();
}

backup().catch(console.error);
