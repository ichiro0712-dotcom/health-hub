import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

async function main() {
  const backupPath = "./backup/data_backup_2026-01-20T17-59-15-575Z.json";
  const backup = JSON.parse(fs.readFileSync(backupPath, "utf-8"));

  // Get ichiro user
  const user = await prisma.user.findUnique({ where: { email: "ichiro0712@gmail.com" } });
  if (user === null) {
    throw new Error("User not found");
  }

  console.log("Importing health records for user:", user.id);

  // Import health records
  for (const record of backup.healthRecords) {
    await prisma.healthRecord.upsert({
      where: { id: record.id },
      update: {},
      create: {
        id: record.id,
        userId: user.id,
        date: new Date(record.date),
        status: record.status,
        title: record.title,
        summary: record.summary,
        data: record.data,
        additional_data: record.additional_data,
        images: record.images,
        createdAt: new Date(record.createdAt),
        updatedAt: new Date(record.updatedAt),
      },
    });
    console.log("  - Imported:", record.title);
  }

  console.log("\nImporting supplements...");

  // Import supplements
  for (const supp of backup.supplements) {
    await prisma.supplement.upsert({
      where: { id: supp.id },
      update: {},
      create: {
        id: supp.id,
        userId: user.id,
        name: supp.name,
        amount: supp.amount || "",
        unit: supp.unit || "",
        timing: supp.timing || [],
        order: supp.order || 0,
        manufacturer: supp.manufacturer || "",
        note: supp.note || "",
        startDate: supp.startDate ? new Date(supp.startDate) : null,
        pausedPeriods: supp.pausedPeriods || [],
        createdAt: new Date(supp.createdAt),
        updatedAt: new Date(supp.updatedAt),
      },
    });
    console.log("  - Imported:", supp.name);
  }

  const recordCount = await prisma.healthRecord.count({ where: { userId: user.id } });
  const suppCount = await prisma.supplement.count({ where: { userId: user.id } });

  console.log("\n✅ Import complete!");
  console.log("  Health records:", recordCount);
  console.log("  Supplements:", suppCount);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
