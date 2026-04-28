-- Add quiz mode support to community_polls
ALTER TABLE "community_polls" ADD COLUMN "isQuiz" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "community_polls" ADD COLUMN "correctOptionId" UUID;
