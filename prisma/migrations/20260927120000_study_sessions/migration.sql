CREATE TABLE "StudySession" (
  "id" TEXT NOT NULL,
  "learnerId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "unitNumber" INTEGER,
  "lesson" INTEGER,
  "questionPlan" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "result" JSONB,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudySession_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Attempt" ADD COLUMN "clientAttemptId" TEXT;
ALTER TABLE "Attempt" ADD COLUMN "studySessionId" TEXT;
ALTER TABLE "Attempt" ADD COLUMN "questionKey" TEXT;
CREATE UNIQUE INDEX "Attempt_clientAttemptId_key" ON "Attempt"("clientAttemptId");
CREATE INDEX "Attempt_studySessionId_idx" ON "Attempt"("studySessionId");
CREATE INDEX "StudySession_learnerId_status_updatedAt_idx" ON "StudySession"("learnerId", "status", "updatedAt");
ALTER TABLE "StudySession" ADD CONSTRAINT "StudySession_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "Learner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_studySessionId_fkey" FOREIGN KEY ("studySessionId") REFERENCES "StudySession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
