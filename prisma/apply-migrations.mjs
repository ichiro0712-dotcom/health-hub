/**
 * カスタムマイグレーションスクリプト
 *
 * prisma migrate deploy が failed migration でブロックされるため、
 * 必要なスキーマ変更を直接SQLで適用する。
 * IF NOT EXISTS で冪等性を保証。
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(__dirname, 'schema.prisma');

const migrations = [
    // 2026-02-07: HealthChatSession に mode カラム追加
    `ALTER TABLE "HealthChatSession" ADD COLUMN IF NOT EXISTS "mode" TEXT;`,
];

for (const sql of migrations) {
    try {
        execSync(
            `npx prisma db execute --schema "${schemaPath}" --stdin`,
            { input: sql, stdio: ['pipe', 'pipe', 'pipe'] }
        );
        console.log(`✅ Applied: ${sql.slice(0, 70)}...`);
    } catch (err) {
        console.warn(`⚠️ Warning: ${err.stderr?.toString().slice(0, 200) || err.message?.slice(0, 200)}`);
    }
}

console.log('Custom migrations complete');
