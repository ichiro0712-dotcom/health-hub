import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting migration: Initializing persistent IDs for existing items...');

    // 1. Get all users
    const users = await prisma.user.findMany({ select: { id: true, email: true } });
    console.log(`Found ${users.length} users.`);

    for (const user of users) {
        console.log(`Processing user: ${user.email} (${user.id})`);
        
        // 2. Get all health records for the user
        const records = await prisma.healthRecord.findMany({
            where: { userId: user.id },
            select: { data: true }
        });

        const uniqueNames = new Set<string>();

        // 3. Extract all unique item names
        for (const record of records) {
            const data = record.data as any;
            let results: any[] = [];

            if (Array.isArray(data)) {
                results = data;
            } else if (data?.results && Array.isArray(data.results)) {
                results = data.results;
            }

            for (const r of results) {
                if (r.item && typeof r.item === 'string' && r.item.trim()) {
                    uniqueNames.add(r.item.trim());
                }
            }
        }

        console.log(`  Found ${uniqueNames.size} unique items.`);

        // 4. Register each item if not exists
        for (const name of Array.from(uniqueNames)) {
            // Check if alias exists
            const existingAlias = await prisma.inspectionItemAlias.findFirst({
                where: {
                    item: { userId: user.id },
                    originalName: name
                }
            });

            if (!existingAlias) {
                try {
                    // Create new Item and Alias (1:1 mapping initially)
                    await prisma.inspectionItem.create({
                        data: {
                            userId: user.id,
                            name: name, // Initial name is the original name
                            aliases: {
                                create: {
                                    originalName: name
                                }
                            }
                        }
                    });
                } catch (e) {
                    // Ignore duplicates or race conditions gracefully
                }
            }
        }
    }
    
    console.log('Migration completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
