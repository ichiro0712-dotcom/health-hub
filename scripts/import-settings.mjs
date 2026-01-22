import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres.tmlwtmqoffgrlpedstns:xI6hSgTGSYJVGWsR1dpSLbpi@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres"
    }
  }
});

async function importSettings() {
  const localData = JSON.parse(fs.readFileSync('backups/local_export.json', 'utf-8'));
  
  // 本番DBの実ユーザーID
  const prodUserId = 'cmknmxf4i00004bvga37zrd2a';
  
  // ローカルのGoogleDocsSettings
  const localSettings = localData.googleDocsSettings[0];
  
  if (!localSettings) {
    console.log('No GoogleDocsSettings to import');
    return;
  }
  
  // 本番DBにGoogleDocsSettingsをupsert
  const result = await prisma.googleDocsSettings.upsert({
    where: { userId: prodUserId },
    update: {
      recordsDocId: localSettings.recordsDocId,
      recordsHeaderText: localSettings.recordsHeaderText,
      profileDocId: localSettings.profileDocId,
      profileHeaderText: localSettings.profileHeaderText,
      autoSyncEnabled: localSettings.autoSyncEnabled,
    },
    create: {
      userId: prodUserId,
      recordsDocId: localSettings.recordsDocId,
      recordsHeaderText: localSettings.recordsHeaderText,
      profileDocId: localSettings.profileDocId,
      profileHeaderText: localSettings.profileHeaderText,
      autoSyncEnabled: localSettings.autoSyncEnabled,
    }
  });
  
  console.log('GoogleDocsSettings imported successfully:', result.id);
  
  await prisma.$disconnect();
}

importSettings().catch(console.error);
