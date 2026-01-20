
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // 1. Get a sample health record data
    const record = await prisma.healthRecord.findFirst({
        where: { data: { path: ['results'], array_contains: [{ item: 'LDL Cholesterol (LDLコレステロール)' }] } }, // Try to find one with the old name if possible, or just grab the latest
        take: 1,
        orderBy: { date: 'desc' }
    })

    if (!record) {
        console.log("No record found with specific LDL query, fetching latest record...")
        const latest = await prisma.healthRecord.findFirst({ orderBy: { date: 'desc' }, take: 1 });
        if (latest) {
            console.log("Latest Record Results Sample:");
            // @ts-ignore
            console.log(JSON.stringify(latest.data?.results?.slice(0, 5) || [], null, 2));
        }
    } else {
        console.log("Found record with old LDL name:");
        // @ts-ignore
        console.log(JSON.stringify(record.data?.results?.filter(r => r.item.includes('LDL')), null, 2));
    }

    // 2. Check InspectionItem for LDL
    const ldlItem = await prisma.inspectionItem.findFirst({
        where: { name: 'LDLコレステロール' },
        include: { aliases: true }
    })

    if (ldlItem) {
        console.log("\n--- Current InspectionItem for LDL ---")
        console.log(`Name: ${ldlItem.name}`)
        console.log("Aliases:", ldlItem.aliases.map(a => a.originalName))
    } else {
        console.log("\nItem 'LDLコレステロール' not found.")
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
