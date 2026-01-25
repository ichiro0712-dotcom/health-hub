import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL
        }
    }
});

async function main() {
    console.log('本番DBの接続確認中...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 50) + '...');

    try {
        // テーブル一覧を取得
        const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
            SELECT tablename
            FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY tablename;
        `;

        console.log('\n本番DBのテーブル一覧:');
        tables.forEach(t => console.log(`  - ${t.tablename}`));

        // Habitテーブルが存在するか確認
        const hasHabitTable = tables.some(t => t.tablename === 'Habit');
        console.log(`\nHabitテーブル: ${hasHabitTable ? '存在する ✓' : '存在しない ✗'}`);

        if (hasHabitTable) {
            // 習慣データを確認
            const habits = await prisma.habit.findMany({
                where: {
                    user: {
                        email: 'ichiro0712@gmail.com'
                    }
                }
            });
            console.log(`\nichiro0712@gmail.comの習慣数: ${habits.length}個`);
            if (habits.length > 0) {
                console.log('習慣リスト:');
                habits.forEach(h => console.log(`  - ${h.name} (${h.type})`));
            }
        }

    } catch (error) {
        console.error('エラー:', error);
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
