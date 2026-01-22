import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

async function main() {
  // Read the latest backup
  const backupPath = "./backup/full_backup_2026-01-21T07-50-29-311Z.json";
  const backup = JSON.parse(fs.readFileSync(backupPath, "utf-8"));

  console.log("=== Importing to Production Database ===");
  console.log("Backup timestamp:", backup.timestamp);

  // Get or create ichiro user
  let user = await prisma.user.findUnique({
    where: { email: "ichiro0712@gmail.com" },
  });

  if (user === null) {
    user = await prisma.user.create({
      data: {
        email: "ichiro0712@gmail.com",
        name: backup.user.name || "Ichiro",
        birthDate: backup.user.birthDate ? new Date(backup.user.birthDate) : new Date("1978-07-12"),
        image: "https://ui-avatars.com/api/?name=Ichiro&background=random",
      },
    });
    console.log("Created new user:", user.id);
  } else {
    // Update birthDate if needed
    if (!user.birthDate) {
      await prisma.user.update({
        where: { id: user.id },
        data: { birthDate: new Date("1978-07-12") },
      });
    }
    console.log("Found existing user:", user.id);
  }

  // Import health records
  console.log("\nImporting health records...");
  for (const record of backup.healthRecords) {
    try {
      await prisma.healthRecord.upsert({
        where: { id: record.id },
        update: {
          date: new Date(record.date),
          status: record.status,
          title: record.title,
          summary: record.summary,
          data: record.data,
          additional_data: record.additional_data,
          images: record.images,
        },
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
        },
      });
      console.log("  ✓", record.title);
    } catch (err) {
      console.log("  ✗", record.title, err);
    }
  }

  // Import supplements
  console.log("\nImporting supplements...");
  for (const supp of backup.supplements) {
    try {
      await prisma.supplement.upsert({
        where: { id: supp.id },
        update: {
          name: supp.name,
          amount: supp.amount || "",
          unit: supp.unit || "",
          timing: supp.timing || [],
          order: supp.order || 0,
          manufacturer: supp.manufacturer || "",
          note: supp.note || "",
          startDate: supp.startDate ? new Date(supp.startDate) : null,
          pausedPeriods: supp.pausedPeriods || [],
        },
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
        },
      });
      console.log("  ✓", supp.name);
    } catch (err) {
      console.log("  ✗", supp.name, err);
    }
  }

  // Import health profile sections
  console.log("\nImporting health profile sections...");
  for (const section of backup.healthProfileSections) {
    try {
      await prisma.healthProfileSection.upsert({
        where: {
          userId_categoryId: {
            userId: user.id,
            categoryId: section.categoryId,
          },
        },
        update: {
          title: section.title,
          content: section.content,
          orderIndex: section.orderIndex,
        },
        create: {
          userId: user.id,
          categoryId: section.categoryId,
          title: section.title,
          content: section.content,
          orderIndex: section.orderIndex,
        },
      });
      console.log("  ✓", section.title);
    } catch (err) {
      console.log("  ✗", section.title, err);
    }
  }

  // Summary
  const recordCount = await prisma.healthRecord.count({ where: { userId: user.id } });
  const suppCount = await prisma.supplement.count({ where: { userId: user.id } });
  const sectionCount = await prisma.healthProfileSection.count({ where: { userId: user.id } });

  console.log("\n=== Import Complete ===");
  console.log("  Health records:", recordCount);
  console.log("  Supplements:", suppCount);
  console.log("  Health profile sections:", sectionCount);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
