-- AlterTable: add isBlocked to users
ALTER TABLE "users" ADD COLUMN "isBlocked" BOOLEAN NOT NULL DEFAULT false;

-- Index for querying blocked users
CREATE INDEX "users_isBlocked_idx" ON "users"("isBlocked");
