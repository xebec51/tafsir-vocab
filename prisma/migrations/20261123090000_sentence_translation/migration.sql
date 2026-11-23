-- CreateTable
CREATE TABLE "SentenceSegment" (
    "id" TEXT NOT NULL,
    "pageId" INTEGER NOT NULL,
    "verseId" INTEGER NOT NULL,
    "segmentOrder" INTEGER NOT NULL,
    "verseOrder" INTEGER NOT NULL DEFAULT 1,
    "startWordPosition" INTEGER,
    "endWordPosition" INTEGER,
    "arabicText" TEXT NOT NULL,
    "englishTranslation" TEXT,
    "indonesianTranslation" TEXT,
    "translationSource" TEXT,
    "sourceUrl" TEXT,
    "contextNote" TEXT,
    "explanation" TEXT,
    "acceptedAnswers" JSONB NOT NULL DEFAULT '[]',
    "audioUrl" TEXT,
    "audioVerified" BOOLEAN NOT NULL DEFAULT false,
    "curationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SentenceSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SentenceSegmentWord" (
    "segmentId" TEXT NOT NULL,
    "occurrenceId" INTEGER NOT NULL,

    CONSTRAINT "SentenceSegmentWord_pkey" PRIMARY KEY ("segmentId","occurrenceId")
);

-- CreateTable
CREATE TABLE "SentenceProgress" (
    "id" SERIAL NOT NULL,
    "learnerId" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
    "correctCount" INTEGER NOT NULL DEFAULT 0,
    "wrongCount" INTEGER NOT NULL DEFAULT 0,
    "streakCorrect" INTEGER NOT NULL DEFAULT 0,
    "masteryLevel" TEXT NOT NULL DEFAULT 'NEW',
    "intervalDays" INTEGER NOT NULL DEFAULT 0,
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "lastReviewedAt" TIMESTAMP(3),
    "nextReviewAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SentenceProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SentenceQuizSession" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "questionPlan" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SentenceQuizSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SentenceQuizAttempt" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "segmentId" TEXT NOT NULL,
    "questionKey" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "responseTimeMs" INTEGER NOT NULL,
    "xpAwarded" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SentenceQuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SentenceSegment_curationStatus_pageId_idx" ON "SentenceSegment"("curationStatus", "pageId");

-- CreateIndex
CREATE UNIQUE INDEX "SentenceSegment_pageId_verseId_verseOrder_key" ON "SentenceSegment"("pageId", "verseId", "verseOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SentenceSegment_pageId_segmentOrder_key" ON "SentenceSegment"("pageId", "segmentOrder");

-- CreateIndex
CREATE INDEX "SentenceSegmentWord_occurrenceId_idx" ON "SentenceSegmentWord"("occurrenceId");

-- CreateIndex
CREATE INDEX "SentenceProgress_learnerId_nextReviewAt_idx" ON "SentenceProgress"("learnerId", "nextReviewAt");

-- CreateIndex
CREATE UNIQUE INDEX "SentenceProgress_learnerId_segmentId_key" ON "SentenceProgress"("learnerId", "segmentId");

-- CreateIndex
CREATE UNIQUE INDEX "SentenceQuizSession_requestId_key" ON "SentenceQuizSession"("requestId");

-- CreateIndex
CREATE INDEX "SentenceQuizSession_learnerId_status_updatedAt_idx" ON "SentenceQuizSession"("learnerId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "SentenceQuizAttempt_sessionId_createdAt_idx" ON "SentenceQuizAttempt"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "SentenceQuizAttempt_learnerId_segmentId_createdAt_idx" ON "SentenceQuizAttempt"("learnerId", "segmentId", "createdAt");

-- AddForeignKey
ALTER TABLE "SentenceSegment" ADD CONSTRAINT "SentenceSegment_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SentenceSegment" ADD CONSTRAINT "SentenceSegment_verseId_fkey" FOREIGN KEY ("verseId") REFERENCES "Verse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SentenceSegmentWord" ADD CONSTRAINT "SentenceSegmentWord_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "SentenceSegment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SentenceSegmentWord" ADD CONSTRAINT "SentenceSegmentWord_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "WordOccurrence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SentenceProgress" ADD CONSTRAINT "SentenceProgress_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "Learner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SentenceProgress" ADD CONSTRAINT "SentenceProgress_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "SentenceSegment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SentenceQuizSession" ADD CONSTRAINT "SentenceQuizSession_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "Learner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SentenceQuizAttempt" ADD CONSTRAINT "SentenceQuizAttempt_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "Learner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SentenceQuizAttempt" ADD CONSTRAINT "SentenceQuizAttempt_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SentenceQuizSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SentenceQuizAttempt" ADD CONSTRAINT "SentenceQuizAttempt_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "SentenceSegment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
