-- Living Lab identity (email verification). Additive only: two new tables and one nullable
-- column on HriPassport. Existing passports and sessions are not modified.
-- CreateTable
CREATE TABLE "HriParticipant" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL,
    "sessionVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HriParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HriEmailChallenge" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HriEmailChallenge_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "HriPassport" ADD COLUMN "participantId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "HriParticipant_email_key" ON "HriParticipant"("email");

-- CreateIndex
CREATE INDEX "HriEmailChallenge_email_createdAt_idx" ON "HriEmailChallenge"("email", "createdAt");

-- CreateIndex
CREATE INDEX "HriEmailChallenge_expiresAt_idx" ON "HriEmailChallenge"("expiresAt");

-- CreateIndex
CREATE INDEX "HriPassport_participantId_idx" ON "HriPassport"("participantId");

-- AddForeignKey
ALTER TABLE "HriPassport" ADD CONSTRAINT "HriPassport_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "HriParticipant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
