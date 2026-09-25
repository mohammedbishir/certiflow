-- CreateEnum
CREATE TYPE "EventKind" AS ENUM ('WORKSHOP', 'SPORTS_MEET');

-- CreateEnum
CREATE TYPE "Placement" AS ENUM ('FIRST', 'SECOND', 'THIRD');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "kind" "EventKind" NOT NULL DEFAULT 'WORKSHOP';

-- CreateIndex
CREATE INDEX "Event_kind_idx" ON "Event"("kind");

-- CreateTable
CREATE TABLE "EventGame" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "templateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameResult" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "placement" "Placement" NOT NULL,
    "teamLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameResult_pkey" PRIMARY KEY ("id")
);

-- DropForeignKey Certificate -> Participant (will recreate)
ALTER TABLE "Certificate" DROP CONSTRAINT IF EXISTS "Certificate_participantId_fkey";

-- Drop unique on participantId so one person can win multiple games
DROP INDEX IF EXISTS "Certificate_participantId_key";

-- AlterTable Certificate
ALTER TABLE "Certificate" ADD COLUMN "gameResultId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_gameResultId_key" ON "Certificate"("gameResultId");
CREATE INDEX "Certificate_participantId_idx" ON "Certificate"("participantId");

-- CreateIndex EventGame
CREATE INDEX "EventGame_eventId_idx" ON "EventGame"("eventId");
CREATE INDEX "EventGame_templateId_idx" ON "EventGame"("templateId");

-- CreateIndex GameResult
CREATE UNIQUE INDEX "GameResult_gameId_participantId_key" ON "GameResult"("gameId", "participantId");
CREATE INDEX "GameResult_gameId_idx" ON "GameResult"("gameId");
CREATE INDEX "GameResult_participantId_idx" ON "GameResult"("participantId");

-- AddForeignKey
ALTER TABLE "EventGame" ADD CONSTRAINT "EventGame_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventGame" ADD CONSTRAINT "EventGame_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CertificateTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GameResult" ADD CONSTRAINT "GameResult_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "EventGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameResult" ADD CONSTRAINT "GameResult_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_gameResultId_fkey" FOREIGN KEY ("gameResultId") REFERENCES "GameResult"("id") ON DELETE SET NULL ON UPDATE CASCADE;
