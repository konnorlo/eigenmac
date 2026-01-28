/*
  Warnings:

  - You are about to drop the column `attempts` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `averageScore` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `highScore` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "attempts",
DROP COLUMN "averageScore",
DROP COLUMN "highScore";

-- CreateTable
CREATE TABLE "UserStat" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dimension" INTEGER NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "bestScore" INTEGER NOT NULL DEFAULT 0,
    "totalTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserStat_userId_dimension_key" ON "UserStat"("userId", "dimension");

-- AddForeignKey
ALTER TABLE "UserStat" ADD CONSTRAINT "UserStat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
