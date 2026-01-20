
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const IS_DRY_RUN = process.argv.includes('--dry-run');

function containsJapanese(text: string) {
    return /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]/.test(text);
}

async function main() {
    console.log(`Starting Simplification (Dry Run: ${IS_DRY_RUN})...`);

    const items = await prisma.inspectionItem.findMany({
        where: {},
        include: { aliases: true, history: true }
    });

    for (const item of items) {
        // Pattern: "Something (SomethingJapanese)"
        // Captures "English Part" and "Japanese Part"
        // Regex: (Anything Greedy) [optional space] ( (Anything inside Greedy) )
        // Using greedy .* for first part ensures we align with the LAST parentheses group.
        const match = item.name.match(/^(.*)[\s　]*\((.*)\)$/);

        if (match) {
            const englishPart = match[1];
            const contentInParens = match[2];

            if (containsJapanese(contentInParens) && !containsJapanese(englishPart)) {
                // Case 1: English (Japanese) -> Japanese
                // e.g. "Weight (体重)" -> "体重"
                const newName = contentInParens.trim();
                if (newName !== item.name) {
                    console.log(`[CANDIDATE] "${item.name}" -> "${newName}" (Use parens content)`);
                    await processRename(item, newName);
                }

            } else if (containsJapanese(englishPart) && !containsJapanese(contentInParens)) {
                // Case 2: Japanese (English) -> Japanese
                // e.g. "視力 (Vision)" -> "視力"
                // e.g. "眼圧 (右) (Intraocular Pressure - Right)" -> "眼圧 (右)"
                const nameBeforeParens = englishPart.trim();
                if (nameBeforeParens !== item.name) {
                    console.log(`[CANDIDATE] "${item.name}" -> "${nameBeforeParens}" (Use part before parens)`);
                    await processRename(item, nameBeforeParens);
                }
            } else {
                console.log(`[SKIP] "${item.name}" (Ambiguous or both JP/Non-JP: '${englishPart}' vs '${contentInParens}')`);
            }
        }
    }
    console.log('Finished.');
}

async function processRename(item: any, newName: string) {
    if (IS_DRY_RUN) return;

    // Check conflict
    const existing = await prisma.inspectionItem.findUnique({
        where: { userId_name: { userId: item.userId, name: newName } }
    });

    if (existing) {
        console.log(`  -> Target "${newName}" exists. MERGING...`);
        await prisma.inspectionItemAlias.updateMany({
            where: { inspectionItemId: item.id },
            data: { inspectionItemId: existing.id }
        });
        await prisma.inspectionItemHistory.updateMany({
            where: { inspectionItemId: item.id },
            data: { inspectionItemId: existing.id }
        });

        // Safely create alias
        const aliasExists = await prisma.inspectionItemAlias.findFirst({
            where: {
                inspectionItemId: existing.id,
                originalName: item.name
            }
        });

        if (!aliasExists) {
            await prisma.inspectionItemAlias.create({
                data: { inspectionItemId: existing.id, originalName: item.name }
            });
        }

        await prisma.inspectionItem.delete({ where: { id: item.id } });
        console.log(`  -> Merged old item into "${newName}" and created alias.`);
    } else {
        console.log(`  -> Renaming...`);
        await prisma.inspectionItem.update({
            where: { id: item.id },
            data: { name: newName }
        });

        // Safely create alias
        const aliasExists = await prisma.inspectionItemAlias.findFirst({
            where: {
                inspectionItemId: item.id,
                originalName: item.name
            }
        });

        if (!aliasExists) {
            await prisma.inspectionItemAlias.create({
                data: { inspectionItemId: item.id, originalName: item.name }
            });
        }
        console.log(`  -> Renamed and created alias for "${item.name}"`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
