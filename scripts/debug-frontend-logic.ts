
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("--- Starting Frontend Logic Simulation ---");

    // 1. Fetch User ID
    const user = await prisma.user.findUnique({ where: { email: 'test@example.com' } });
    if (!user) { console.error("User not found"); return; }
    const userId = user.id;
    console.log(`User ID: ${userId}`);

    // 2. Fetch Records (mimic getRecords)
    const records = await prisma.healthRecord.findMany({
        where: { userId: userId },
        orderBy: { date: 'desc' }
    });
    console.log(`Records Found: ${records.length}`);

    // 3. Fetch Mappings (mimic getItemMappings server-side logic)
    const aliases = await prisma.inspectionItemAlias.findMany({
        where: { item: { userId } },
        include: { item: true }
    });
    const mapping: Record<string, string> = {};
    aliases.forEach(a => {
        mapping[a.originalName] = a.item.name;
    });
    console.log(`Mappings Found: ${Object.keys(mapping).length}`);
    if (Object.keys(mapping).length > 0) {
        // Debug specific mapping for Height
        const heightKey = Object.keys(mapping).find(k => k.includes('Height'));
        console.log(`Mapping for Height: '${heightKey}' -> '${mapping[heightKey!]}'`);
    }

    // 4. Mimic Frontend Processing Logic
    console.log("\n--- Processing Records ---");
    let mappedCount = 0;
    records.forEach(record => {
        const d = record.data as any;
        let rawResults: any[] = [];
        if (Array.isArray(d)) {
            rawResults = d;
        } else if (d?.results && Array.isArray(d.results)) {
            rawResults = d.results;
        }

        rawResults.forEach((res: any) => {
            const rawName = res.item?.trim();
            if (!rawName) return;

            // Logic from src/app/trends/page.tsx
            const displayName = mapping[rawName] || rawName;

            if (rawName.includes('Height') || rawName.includes('身長')) {
                console.log(`Item: '${rawName}'`);
                console.log(`  -> After trim: '${rawName}'`);
                console.log(`  -> Display Name: '${displayName}'`);
                console.log(`  -> Match?: ${displayName !== rawName ? 'YES (Mapped)' : 'NO (Raw)'}`);
                if (displayName !== rawName) mappedCount++;
            }
        });
    });
    console.log(`\nTotal Successful Mappings for 'Height': ${mappedCount}`);
}

main().finally(() => prisma.$disconnect());
