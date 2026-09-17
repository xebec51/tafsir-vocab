-- TafsirVocab initial PostgreSQL schema
CREATE TABLE "Juz" (
  "id" INTEGER NOT NULL,
  "number" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Juz_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Page" (
  "id" SERIAL NOT NULL,
  "juzId" INTEGER NOT NULL,
  "unitNumber" INTEGER NOT NULL,
  "mushafPage" INTEGER NOT NULL,
  "label" TEXT NOT NULL,
  "surahLabel" TEXT,
  "verseRange" TEXT,
  "wordCount" INTEGER NOT NULL DEFAULT 0,
  "coreWordCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Lexeme" (
  "id" SERIAL NOT NULL,
  "key" TEXT NOT NULL,
  "arabicDisplay" TEXT NOT NULL,
  "lemma" TEXT,
  "lemmaCorpus" TEXT,
  "root" TEXT,
  "rootCorpus" TEXT,
  "partOfSpeech" TEXT,
  "englishPrimary" TEXT,
  "englishAlternatives" TEXT NOT NULL DEFAULT '[]',
  "indonesian" TEXT,
  "courseStatus" TEXT NOT NULL DEFAULT 'CORE',
  "reviewStatus" TEXT NOT NULL DEFAULT 'PROVISIONAL',
  "difficulty" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Lexeme_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WordOccurrence" (
  "id" SERIAL NOT NULL,
  "pageId" INTEGER NOT NULL,
  "lexemeId" INTEGER NOT NULL,
  "location" TEXT NOT NULL,
  "verseKey" TEXT NOT NULL,
  "surah" INTEGER NOT NULL,
  "ayah" INTEGER NOT NULL,
  "wordPosition" INTEGER NOT NULL,
  "arabic" TEXT NOT NULL,
  "uthmani" TEXT,
  "normalizedArabic" TEXT NOT NULL,
  "transliteration" TEXT,
  "sourceEnglish" TEXT,
  "sourceIndonesian" TEXT,
  "contextArabic" TEXT,
  "audioUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WordOccurrence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Learner" (
  "id" TEXT NOT NULL,
  "displayName" TEXT,
  "xp" INTEGER NOT NULL DEFAULT 0,
  "streakDays" INTEGER NOT NULL DEFAULT 0,
  "lastStudyDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Learner_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WordProgress" (
  "id" SERIAL NOT NULL,
  "learnerId" TEXT NOT NULL,
  "lexemeId" INTEGER NOT NULL,
  "masteryLevel" TEXT NOT NULL DEFAULT 'NEW',
  "correctCount" INTEGER NOT NULL DEFAULT 0,
  "wrongCount" INTEGER NOT NULL DEFAULT 0,
  "streakCorrect" INTEGER NOT NULL DEFAULT 0,
  "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
  "intervalDays" INTEGER NOT NULL DEFAULT 0,
  "lastReviewedAt" TIMESTAMP(3),
  "nextReviewAt" TIMESTAMP(3),
  "averageResponseMs" INTEGER,
  CONSTRAINT "WordProgress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PageProgress" (
  "id" SERIAL NOT NULL,
  "learnerId" TEXT NOT NULL,
  "pageId" INTEGER NOT NULL,
  "masteryStars" INTEGER NOT NULL DEFAULT 0,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "bestAccuracy" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "sessions" INTEGER NOT NULL DEFAULT 0,
  "lastStudiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PageProgress_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Attempt" (
  "id" SERIAL NOT NULL,
  "learnerId" TEXT NOT NULL,
  "lexemeId" INTEGER NOT NULL,
  "occurrenceId" INTEGER,
  "exerciseType" TEXT NOT NULL,
  "correct" BOOLEAN NOT NULL,
  "response" TEXT,
  "responseTimeMs" INTEGER,
  "xpAwarded" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Juz_number_key" ON "Juz"("number");
CREATE UNIQUE INDEX "Page_juzId_unitNumber_key" ON "Page"("juzId", "unitNumber");
CREATE UNIQUE INDEX "Page_juzId_mushafPage_key" ON "Page"("juzId", "mushafPage");
CREATE UNIQUE INDEX "Lexeme_key_key" ON "Lexeme"("key");
CREATE INDEX "Lexeme_lemma_idx" ON "Lexeme"("lemma");
CREATE INDEX "Lexeme_root_idx" ON "Lexeme"("root");
CREATE INDEX "Lexeme_courseStatus_idx" ON "Lexeme"("courseStatus");
CREATE INDEX "Lexeme_reviewStatus_idx" ON "Lexeme"("reviewStatus");
CREATE UNIQUE INDEX "WordOccurrence_location_key" ON "WordOccurrence"("location");
CREATE INDEX "WordOccurrence_pageId_idx" ON "WordOccurrence"("pageId");
CREATE INDEX "WordOccurrence_lexemeId_idx" ON "WordOccurrence"("lexemeId");
CREATE INDEX "WordOccurrence_verseKey_idx" ON "WordOccurrence"("verseKey");
CREATE INDEX "WordOccurrence_surah_ayah_idx" ON "WordOccurrence"("surah", "ayah");
CREATE UNIQUE INDEX "WordProgress_learnerId_lexemeId_key" ON "WordProgress"("learnerId", "lexemeId");
CREATE INDEX "WordProgress_learnerId_nextReviewAt_idx" ON "WordProgress"("learnerId", "nextReviewAt");
CREATE UNIQUE INDEX "PageProgress_learnerId_pageId_key" ON "PageProgress"("learnerId", "pageId");
CREATE INDEX "PageProgress_learnerId_completed_idx" ON "PageProgress"("learnerId", "completed");
CREATE INDEX "Attempt_learnerId_createdAt_idx" ON "Attempt"("learnerId", "createdAt");
CREATE INDEX "Attempt_lexemeId_createdAt_idx" ON "Attempt"("lexemeId", "createdAt");

ALTER TABLE "Page" ADD CONSTRAINT "Page_juzId_fkey" FOREIGN KEY ("juzId") REFERENCES "Juz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WordOccurrence" ADD CONSTRAINT "WordOccurrence_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WordOccurrence" ADD CONSTRAINT "WordOccurrence_lexemeId_fkey" FOREIGN KEY ("lexemeId") REFERENCES "Lexeme"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WordProgress" ADD CONSTRAINT "WordProgress_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "Learner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WordProgress" ADD CONSTRAINT "WordProgress_lexemeId_fkey" FOREIGN KEY ("lexemeId") REFERENCES "Lexeme"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PageProgress" ADD CONSTRAINT "PageProgress_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "Learner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PageProgress" ADD CONSTRAINT "PageProgress_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "Learner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_lexemeId_fkey" FOREIGN KEY ("lexemeId") REFERENCES "Lexeme"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "WordOccurrence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
