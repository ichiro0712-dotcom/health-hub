import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const records = await prisma.healthRecord.findMany();
  const lifestyleHabits = await prisma.lifestyleHabit.findMany();
  const supplements = await prisma.supplement.findMany();

  const backup = {
    timestamp: new Date().toISOString(),
    healthRecords: records,
    lifestyleHabits: lifestyleHabits,
    supplements: supplements
  };

  const now = new Date();
  const filename = `backup/data_backup_${now.toISOString().replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(filename, JSON.stringify(backup, null, 2));
  console.log(`Backup saved to ${filename}`);
  console.log(`- HealthRecords: ${records.length}`);
  console.log(`- LifestyleHabits: ${lifestyleHabits.length}`);
  console.log(`- Supplements: ${supplements.length}`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
