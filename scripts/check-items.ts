
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const count = await prisma.inspectionItem.count();
    console.log(`InspectionItem count: ${count}`);
    const aliases = await prisma.inspectionItemAlias.count();
    console.log(`InspectionItemAlias count: ${aliases}`);
}
main().finally(() => prisma.$disconnect());
