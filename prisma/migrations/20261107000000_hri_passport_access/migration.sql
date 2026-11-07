-- HRI Passport access control (Phase 2). Additive only: new nullable/defaulted columns,
-- a new rate-limit table and indexes. Existing passports and sessions are not modified.
-- AlterTable
ALTER TABLE "HriPassport" ADD COLUMN     "accessTokenHash" TEXT,
ADD COLUMN     "consentAt" TIMESTAMP(3),
ADD COLUMN     "editTokenHash" TEXT,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "HriRateLimit" (
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "HriRateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "HriRateLimit_windowStart_idx" ON "HriRateLimit"("windowStart");

-- CreateIndex
CREATE UNIQUE INDEX "HriPassport_accessTokenHash_key" ON "HriPassport"("accessTokenHash");

