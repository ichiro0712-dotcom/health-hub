-- AlterTable: HealthChatSessionにmodeカラムを追加
ALTER TABLE "HealthChatSession" ADD COLUMN IF NOT EXISTS "mode" TEXT;
