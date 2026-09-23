-- CreateEnum
CREATE TYPE "TemplateType" AS ENUM ('PARTICIPATION', 'COMPLETION', 'ACHIEVEMENT');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "templateId" TEXT;

-- CreateTable
CREATE TABLE "CertificateTemplate" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "templateType" "TemplateType" NOT NULL DEFAULT 'PARTICIPATION',
    "backgroundUrl" TEXT,
    "titleText" TEXT NOT NULL DEFAULT 'Certificate of Participation',
    "subtitleText" TEXT DEFAULT 'This is to certify that',
    "bodyText" TEXT DEFAULT 'has successfully participated in',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CertificateTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CertificateTemplate_organizationId_idx" ON "CertificateTemplate"("organizationId");

-- CreateIndex
CREATE INDEX "Event_templateId_idx" ON "Event"("templateId");

-- AddForeignKey
ALTER TABLE "CertificateTemplate" ADD CONSTRAINT "CertificateTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "CertificateTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
