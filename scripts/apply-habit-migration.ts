import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log('本番DBにHabitマイグレーションを適用中...');

    // マイグレーションSQLを読み込む
    const migrationPath = path.join(
        __dirname,
        '../prisma/migrations/20260124220410_add_habits_feature/migration.sql'
    );

    const sql = fs.readFileSync(migrationPath, 'utf8');

    // SQLステートメントを分割（コメント行を除外し、セミコロンで分割）
    const statements = sql
        .split('\n')
        .filter(line => !line.trim().startsWith('--'))
        .join('\n')
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

    console.log(`\n${statements.length}個のSQLステートメントを実行します\n`);

    try {
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            console.log(`[${i + 1}/${statements.length}] 実行中...`);
            try {
                await prisma.$executeRawUnsafe(statement);
                console.log(`✓ 成功`);
            } catch (error: any) {
                if (error.code === '42P07' || error.message?.includes('already exists')) {
                    console.log(`⚠ スキップ (既に存在)`);
                } else if (error.code === '42710' || error.message?.includes('already exists')) {
                    console.log(`⚠ スキップ (既に存在)`);
                } else {
                    throw error;
                }
            }
        }

        console.log('\n✓ Habitマイグレーションの適用が完了しました！');

        // 確認
        const habits = await prisma.habit.findMany();
        console.log(`現在の習慣数: ${habits.length}個`);
    } catch (error: any) {
        console.error('エラー:', error);
        throw error;
    }
}

main()
    .catch((e) => {
        console.error('エラー:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
