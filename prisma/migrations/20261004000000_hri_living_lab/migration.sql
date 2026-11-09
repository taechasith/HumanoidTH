-- HRI Wellness Living Lab tables (commits 74593ce, 3f0023b). These were applied to existing
-- databases with `prisma db push`; this migration records them so fresh databases match.
-- CreateTable
CREATE TABLE "HriPassport" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nickname" TEXT,
    "greeting" TEXT NOT NULL DEFAULT 'wai',
    "comfortDistance" DOUBLE PRECISION NOT NULL,
    "speed" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "gaze" TEXT NOT NULL DEFAULT 'soft',
    "voice" BOOLEAN NOT NULL DEFAULT true,
    "language" TEXT NOT NULL DEFAULT 'th',
    "anxiety" TEXT NOT NULL DEFAULT 'low',
    "captions" TEXT NOT NULL DEFAULT 'normal',
    "speechPace" TEXT NOT NULL DEFAULT 'normal',
    "noReach" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HriPassport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HriSession" (
    "id" TEXT NOT NULL,
    "protocol" TEXT NOT NULL,
    "passportId" TEXT,
    "robotModelId" TEXT,
    "inputMode" TEXT NOT NULL DEFAULT 'buttons',
    "eventsJson" JSONB NOT NULL DEFAULT '[]',
    "summaryJson" JSONB NOT NULL DEFAULT '{}',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "HriSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HriPassport_code_key" ON "HriPassport"("code");

-- CreateIndex
CREATE INDEX "HriSession_protocol_idx" ON "HriSession"("protocol");

-- CreateIndex
CREATE INDEX "HriSession_robotModelId_idx" ON "HriSession"("robotModelId");

-- AddForeignKey
ALTER TABLE "HriSession" ADD CONSTRAINT "HriSession_passportId_fkey" FOREIGN KEY ("passportId") REFERENCES "HriPassport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HriSession" ADD CONSTRAINT "HriSession_robotModelId_fkey" FOREIGN KEY ("robotModelId") REFERENCES "RobotModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

