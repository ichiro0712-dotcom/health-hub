import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            name: true,
            _count: {
                select: {
                    habits: true,
                }
            }
        }
    });

    console.log('データベース内のユーザー:');
    users.forEach(user => {
        console.log(`- ${user.email} (ID: ${user.id}) - 習慣数: ${user._count.habits}`);
    });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
