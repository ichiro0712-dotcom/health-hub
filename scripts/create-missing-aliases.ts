
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Same logic as before to determine expected simplified name
function containsJapanese(text: string) {
    return /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]/.test(text);
}

function getSimplifiedName(rawName: string): string | null {
    const match = rawName.match(/^(.*) \((.*)\)$/);
    if (match) {
        const contentInParens = match[2];
        if (containsJapanese(contentInParens)) {
            return contentInParens.trim();
        }
    }
    return null;
}

async function main() {
    console.log("Searching for missing aliases...");

    // 1. Get all unique item names currently in HealthRecords
    // This is expensive on large DBs but fine for this scale
    const records = await prisma.healthRecord.findMany({ select: { data: true } });
    const rawNames = new Set<string>();

    records.forEach(r => {
        // @ts-ignore
        const results = r.data?.results;
        if (Array.isArray(results)) {
            results.forEach((res: any) => {
                if (res.item) rawNames.add(res.item.trim());
            });
        }
    });

    console.log(`Found ${rawNames.size} unique raw item names in records.`);

    for (const rawName of rawNames) {
        const simplified = getSimplifiedName(rawName);

        // If the raw name follows the pattern we simplify...
        if (simplified) {
            // Check if we have an item with the simplified name
            // (We need to check per-user technically, but assuming single user context or global pattern for now.
            //  Actually, InspectionItems are user-scoped. We should loop users or just find *any* item matching.)

            // Better approach: Find users who used this rawName? 
            // Or simpler: Find ANY InspectionItem with the simplified name, and check if it has the alias.

            // Let's iterate inspection items matches.
            const items = await prisma.inspectionItem.findMany({
                where: { name: simplified },
                include: { aliases: true }
            });

            if (items.length > 0) {
                for (const item of items) {
                    // Does this item have an alias for the rawName?
                    const hasAlias = item.aliases.some(a => a.originalName === rawName);

                    if (!hasAlias) {
                        console.log(`[FIX] Creating alias '${rawName}' -> '${item.name}' (User: ${item.userId})`);
                        await prisma.inspectionItemAlias.create({
                            data: {
                                inspectionItemId: item.id,
                                originalName: rawName
                            }
                        });
                    } else {
                        // console.log(`[OK] Alias already exists for '${rawName}' -> '${item.name}'`);
                    }
                }
            }
        }
    }
    console.log("Alias recovery finished.");
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
