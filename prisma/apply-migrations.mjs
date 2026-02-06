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

    // HealthQuestionProgress テーブル（IF NOT EXISTS で冪等）
    `CREATE TABLE IF NOT EXISTS "HealthQuestionProgress" (
        "id" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        "questionId" TEXT NOT NULL,
        "sectionId" TEXT NOT NULL,
        "priority" INTEGER NOT NULL DEFAULT 3,
        "isAnswered" BOOLEAN NOT NULL DEFAULT false,
        "answerSummary" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "HealthQuestionProgress_pkey" PRIMARY KEY ("id")
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "HealthQuestionProgress_userId_questionId_key" ON "HealthQuestionProgress"("userId", "questionId");`,
    `CREATE INDEX IF NOT EXISTS "HealthQuestionProgress_userId_idx" ON "HealthQuestionProgress"("userId");`,
    `CREATE INDEX IF NOT EXISTS "HealthQuestionProgress_userId_sectionId_idx" ON "HealthQuestionProgress"("userId", "sectionId");`,

    // HealthQuestionProgress の外部キー（存在チェック付き）
    `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'HealthQuestionProgress_userId_fkey') THEN
            ALTER TABLE "HealthQuestionProgress" ADD CONSTRAINT "HealthQuestionProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END $$;`,

    // HealthChatSession のチェックポイントカラム（セッション再開用）
    `ALTER TABLE "HealthChatSession" ADD COLUMN IF NOT EXISTS "currentSectionId" TEXT;`,
    `ALTER TABLE "HealthChatSession" ADD COLUMN IF NOT EXISTS "currentQuestionId" TEXT;`,
    `ALTER TABLE "HealthChatSession" ADD COLUMN IF NOT EXISTS "currentPriority" INTEGER DEFAULT 3;`,
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
