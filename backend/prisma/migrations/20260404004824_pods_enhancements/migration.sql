-- CreateEnum
CREATE TYPE "AttachmentType" AS ENUM ('FILE', 'IMAGE', 'VOICE');

-- CreateEnum
CREATE TYPE "JoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "communities" ADD COLUMN     "requiresApproval" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "community_posts" ADD COLUMN     "attachmentType" "AttachmentType",
ADD COLUMN     "repliesCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "community_post_replies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "postId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "attachmentUrl" TEXT,
    "attachmentType" "AttachmentType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_post_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_polls" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "communityId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_polls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_poll_options" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pollId" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "votesCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "community_poll_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_poll_votes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "optionId" UUID NOT NULL,
    "userId" UUID NOT NULL,

    CONSTRAINT "community_poll_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "join_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "communityId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "JoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "join_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "community_post_replies_postId_createdAt_idx" ON "community_post_replies"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "community_polls_communityId_createdAt_idx" ON "community_polls"("communityId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "community_poll_votes_optionId_userId_key" ON "community_poll_votes"("optionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "join_requests_communityId_userId_key" ON "join_requests"("communityId", "userId");

-- AddForeignKey
ALTER TABLE "community_post_replies" ADD CONSTRAINT "community_post_replies_postId_fkey" FOREIGN KEY ("postId") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_post_replies" ADD CONSTRAINT "community_post_replies_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_polls" ADD CONSTRAINT "community_polls_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_polls" ADD CONSTRAINT "community_polls_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_poll_options" ADD CONSTRAINT "community_poll_options_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "community_polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_poll_votes" ADD CONSTRAINT "community_poll_votes_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "community_poll_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_poll_votes" ADD CONSTRAINT "community_poll_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "join_requests" ADD CONSTRAINT "join_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
