-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- Existing organizations were created before approval existed: keep them working.
ALTER TABLE "Organization"
  ADD COLUMN "status" "OrganizationStatus" NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "demoResetAt" TIMESTAMP(3);

-- New signups start pending.
ALTER TABLE "Organization" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "Organization_status_idx" ON "Organization"("status");
