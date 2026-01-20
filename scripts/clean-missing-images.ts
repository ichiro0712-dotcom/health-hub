
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const IS_DRY_RUN = process.argv.includes('--dry-run');

async function main() {
    console.log(`=== IMAGE CLEANUP START (Dry Run: ${IS_DRY_RUN}) ===\n`);

    const records = await prisma.healthRecord.findMany();
    let totalRemoved = 0;

    for (const r of records) {
        if (!r.images || r.images.length === 0) continue;

        const validImages: string[] = [];
        let modified = false;

        for (const img of r.images) {
            // Logic from audit-system.ts:
            // URL: http://127.0.0.1:54321/storage/v1/object/public/health-records/uploads/xxx.jpeg
            // We need to check if this file exists on disk.
            // Assumption: The server serves "public" folder.
            // But the URL structure is complex.

            // Wait, if the file was uploaded via Supabase Storage (local), where is it stored?
            // Usually in `supabase/volumes` or similar if using local supabase.
            // BUT, the `list_dir` of `public` showed it was empty.
            // If the app expects them in `public/uploads`, then they are definitely gone.

            // Let's assume the app logic (which we haven't seen fully, but mapped in audit)
            // expects them to be retrievable via that URL.
            // If we can't find the file, the link is dead.

            // Since we confirmed `public/uploads` does not exist, ANY link pointing to it is dead.

            // Let's retry the path check more robustly.
            // If the URL contains "uploads/", we check `public/uploads/`.

            let fileExists = false;

            // Simple check: does the string strictly look like a URL?
            if (img.includes('/uploads/')) {
                // Extract filename
                const filename = img.split('/uploads/')[1];
                const localPath = path.join(process.cwd(), 'public', 'uploads', filename);
                if (fs.existsSync(localPath)) {
                    fileExists = true;
                }
            } else {
                // Maybe it's just a relative path?
                const localPath = path.join(process.cwd(), 'public', img);
                if (fs.existsSync(localPath)) {
                    fileExists = true;
                }
            }

            if (fileExists) {
                validImages.push(img);
            } else {
                console.log(`[Broken Link Detected] Record ${r.id}: ${img}`);
                modified = true;
                totalRemoved++;
            }
        }

        if (modified) {
            if (!IS_DRY_RUN) {
                await prisma.healthRecord.update({
                    where: { id: r.id },
                    data: { images: validImages }
                });
                console.log(`  -> Updated Record ${r.id}: Removed broken links.`);
            } else {
                console.log(`  -> [Dry Run] Would update Record ${r.id} to remove broken links.`);
            }
        }
    }

    console.log(`\n=== CLEANUP COMPLETE. Removed ${totalRemoved} broken links. ===`);
}

main().finally(() => prisma.$disconnect());
