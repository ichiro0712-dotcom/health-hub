-- CreateTable
CREATE TABLE IF NOT EXISTS "HealthChatSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "currentPriority" INTEGER NOT NULL DEFAULT 3,
    "currentSectionId" TEXT,
    "currentQuestionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "HealthChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "questionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "HealthQuestionProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 3,
    "isAnswered" BOOLEAN NOT NULL DEFAULT false,
    "answerSummary" TEXT,
    "answeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthQuestionProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "HealthChatSession_userId_idx" ON "HealthChatSession"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "HealthChatSession_userId_status_idx" ON "HealthChatSession"("userId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "HealthChatMessage_sessionId_idx" ON "HealthChatMessage"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "HealthQuestionProgress_userId_questionId_key" ON "HealthQuestionProgress"("userId", "questionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "HealthQuestionProgress_userId_idx" ON "HealthQuestionProgress"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "HealthQuestionProgress_userId_sectionId_idx" ON "HealthQuestionProgress"("userId", "sectionId");

-- AddForeignKey (with existence check)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'HealthChatSession_userId_fkey'
    ) THEN
        ALTER TABLE "HealthChatSession" ADD CONSTRAINT "HealthChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (with existence check)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'HealthChatMessage_sessionId_fkey'
    ) THEN
        ALTER TABLE "HealthChatMessage" ADD CONSTRAINT "HealthChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "HealthChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey (with existence check)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'HealthQuestionProgress_userId_fkey'
    ) THEN
        ALTER TABLE "HealthQuestionProgress" ADD CONSTRAINT "HealthQuestionProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
