-- CreateTable
CREATE TABLE "DesignAsset" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'seals',
    "url" TEXT NOT NULL,
    "removeBg" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DesignAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DesignAsset_organizationId_idx" ON "DesignAsset"("organizationId");

-- CreateIndex
CREATE INDEX "DesignAsset_organizationId_category_idx" ON "DesignAsset"("organizationId", "category");

-- AddForeignKey
ALTER TABLE "DesignAsset" ADD CONSTRAINT "DesignAsset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
