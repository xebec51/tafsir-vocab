-- Link TafsirVocab learners to the existing account table without changing legacy rows.
ALTER TABLE "Learner"
  ADD COLUMN IF NOT EXISTS "userId" TEXT,
  ADD COLUMN IF NOT EXISTS "isAnonymous" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "tafsirAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "tafsirSuccessful" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS "Learner_userId_key" ON "Learner"("userId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Learner_userId_fkey'
  ) THEN
    ALTER TABLE "Learner"
      ADD CONSTRAINT "Learner_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
