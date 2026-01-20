
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log("=== SYSTEM INTEGRITY AUDIT START ===\n");

    // 1. Verify User
    const user = await prisma.user.findUnique({ where: { email: 'test@example.com' } });
    if (!user) {
        console.error("CRITICAL: Test user not found!");
        return;
    }
    console.log(`[OK] User Found: ${user.name} (${user.id})`);

    // 2. Verify Habits
    const habits = await prisma.lifestyleHabit.findMany({
        where: { userId: user.id },
        take: 5
    });
    const totalHabits = await prisma.lifestyleHabit.count({ where: { userId: user.id } });
    console.log(`[INFO] Habits (Description): ${totalHabits} total logs found.`);
    if (totalHabits === 0) {
        console.warn("  -> WARNING: No habit logs found. Is this expected?");
    } else {
        console.log(`  -> Sample: ${habits[0].name} in ${habits[0].category}`);
    }

    // 3. Verify Supplements
    const supplements = await prisma.supplement.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 5
    });
    const totalSupplements = await prisma.supplement.count({ where: { userId: user.id } });
    console.log(`[INFO] Supplements: ${totalSupplements} total logs found.`);
    if (totalSupplements === 0) {
        console.warn("  -> WARNING: No supplement logs found. Is this expected?");
    }

    // 4. Verify Master Data
    const masterCount = await prisma.masterItem.count();
    console.log(`[INFO] Master Items: ${masterCount} records found.`);
    if (masterCount === 0) {
        console.error("  -> CRITICAL: MasterItem table is empty! Item normalization will fail.");
    } else {
        console.log("  -> [OK] Master Data exists.");
    }

    // 5. Verify Health Records & Image Consistency
    const records = await prisma.healthRecord.findMany({
        where: { userId: user.id }
    });
    console.log(`[INFO] Health Records: ${records.length} found.`);

    let missingImages = 0;
    records.forEach(r => {
        if (r.images && r.images.length > 0) {
            r.images.forEach(img => {
                // Determine path. Assuming img is a relative URL path like "/uploads/..."
                // Adjust base path as needed.
                const relativePath = img.startsWith('/') ? img.slice(1) : img;
                const fullPath = path.join(process.cwd(), 'public', relativePath);

                if (!fs.existsSync(fullPath)) {
                    console.error(`  -> ERROR: Missing Image File! Record ID: ${r.id}, Path: ${img}`);
                    missingImages++;
                }
            });
        }
    });

    if (missingImages === 0) {
        console.log("  -> [OK] All linked images exist on filesystem.");
    } else {
        console.error(`  -> CRITICAL: ${missingImages} linked images are missing from the disk.`);
    }

    console.log("\n=== AUDIT COMPLETE ===");
}

main().finally(() => prisma.$disconnect());
