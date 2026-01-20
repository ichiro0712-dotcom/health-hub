
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Checking MasterItem table...");
    const count = await prisma.masterItem.count();
    console.log(`Total Master Items: ${count}`);

    if (count > 0) {
        const sample = await prisma.masterItem.findFirst();
        console.log("Sample:", sample);
    } else {
        console.warn("WARNING: MasterItem table is empty.");
    }
}

main().finally(() => prisma.$disconnect());
