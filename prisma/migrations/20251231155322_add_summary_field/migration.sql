/*
  Warnings:

  - The `timing` column on the `Supplement` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Supplement" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "timing",
ADD COLUMN     "timing" TEXT[];
