-- Add missing columns for power leaderboard calculations
ALTER TABLE "UserStat" ADD COLUMN "bestAvg5" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "UserStat" ADD COLUMN "lastFive" JSONB;
