
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// The items we know we messed up
const BAD_NAMES = ["右", "左", "聴力", "前立腺", "肝", "膵・胆道", "食道・肺", "膀胱"];

async function main() {
    console.log("Checking for bad merges...");

    for (const name of BAD_NAMES) {
        const item = await prisma.inspectionItem.findFirst({
            where: { name: name },
            include: { history: true, aliases: true }
        });

        if (!item) {
            console.log(`Item "${name}" not found (maybe already fixed or I missed it).`);
            continue;
        }

        console.log(`\nFound Bad Item: "${item.name}" (ID: ${item.id})`);

        // 1. Check History for Recent Merges
        // We look for history entries on this item that say "MERGE"
        // And where the victimName is something we want to restore.
        const merges = await prisma.inspectionItemHistory.findMany({
            where: {
                inspectionItemId: item.id,
                operationType: 'MERGE'
            },
            orderBy: { createdAt: 'desc' }
        });

        console.log(`  -> History entries: ${merges.length}`);

        for (const h of merges) {
            const details = h.details as any;
            const originalName = details.victimName; // e.g. "聴力 (4000Hz)" or "眼圧 (右)"

            console.log(`    -> Merge Record: "${originalName}" merged into this.`);

            // RESTORE OPERATION
            // 1. Create the original item again
            const restored = await prisma.inspectionItem.create({
                data: {
                    userId: item.userId,
                    name: originalName,
                    masterItemCode: item.masterItemCode // Copy master code if any
                }
            });
            console.log(`      -> Restored Item "${restored.name}" (ID: ${restored.id})`);

            // 2. Find aliases that matches this original name and point them to the restored item
            const aliases = await prisma.inspectionItemAlias.findMany({
                where: {
                    inspectionItemId: item.id,
                    originalName: originalName
                }
            });

            for (const alias of aliases) {
                await prisma.inspectionItemAlias.update({
                    where: { id: alias.id },
                    data: { inspectionItemId: restored.id }
                });
                console.log(`      -> Re-pointed alias "${alias.originalName}" to Restored ID`);
            }

            // 3. Delete the history record
            await prisma.inspectionItemHistory.delete({ where: { id: h.id } });
        }

        // 2. Also, the Item itself might have been renamed from something.
        // But if it was a "Rename" operation, we don't have a MERGE history on the item usually?
        // Wait, "Rename" does NOT create a history entry in my script? 
        // Let's check simplify-items.ts... 
        // "Renaming..." -> await prisma.inspectionItem.update(...)
        // NO HISTORY ENTRY for Rename!

        // So for "Renamed" items (e.g. "眼圧 (右)" -> "右"), the alias exists.
        // We can check the aliases on this item.
        // If an alias looks "Better" (has Japanese and Parens), maybe we should rename the item back to the alias?

        const currentAliases = await prisma.inspectionItemAlias.findMany({
            where: { inspectionItemId: item.id }
        });

        const bestAlias = currentAliases.find(a => a.originalName.includes('(') || a.originalName.includes('（'));
        if (bestAlias) {
            console.log(`    -> Found potentially better name in aliases: "${bestAlias.originalName}"`);

            // If we have "右" and alias "眼圧 (右)", we should rename "右" to "眼圧 (右)".
            // EXCEPT if we just split "聴力" from "聴力 (4000Hz)".
            // If "聴力" has alias "聴力 (1000Hz)" (Because 1000Hz was renamed to 聴力),
            // We should rename "聴力" back to "聴力 (1000Hz)".

            // Check if this alias matches the "Bad Name" pattern
            // e.g. "右" is in "眼圧 (右)"

            if (bestAlias.originalName.includes(name)) {
                await prisma.inspectionItem.update({
                    where: { id: item.id },
                    data: { name: bestAlias.originalName }
                });
                console.log(`      -> Renamed item "${name}" back to "${bestAlias.originalName}"`);
            }
        }
    }
}

main().finally(() => prisma.$disconnect());
