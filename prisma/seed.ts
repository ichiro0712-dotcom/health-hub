import { PrismaClient } from '@prisma/client';
import { MASTER_ITEMS_SEED } from '../src/lib/master-data/jlac10-subset';

const prisma = new PrismaClient();

async function main() {
    console.log('Start seeding Master Items...');

    for (const item of MASTER_ITEMS_SEED) {
        const upsertedItem = await prisma.masterItem.upsert({
            where: { code: item.code },
            update: {
                standardName: item.standardName,
                jlac10: item.jlac10,
                synonyms: item.synonyms
            },
            create: {
                code: item.code,
                standardName: item.standardName,
                jlac10: item.jlac10,
                synonyms: item.synonyms
            }
        });
        console.log(`Upserted master item: ${upsertedItem.standardName} (${upsertedItem.code})`);
    }

    console.log('Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
