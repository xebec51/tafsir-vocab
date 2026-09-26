CREATE TABLE "Verse" (
  "id" SERIAL NOT NULL,
  "surah" INTEGER NOT NULL,
  "ayahNumber" INTEGER NOT NULL,
  "arabicText" TEXT NOT NULL,
  "translation" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Verse_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TafsirNote" (
  "id" SERIAL NOT NULL,
  "verseId" INTEGER NOT NULL,
  "learnerId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "content" JSONB NOT NULL,
  "reference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TafsirNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TafsirVocabulary" (
  "id" SERIAL NOT NULL,
  "verseId" INTEGER NOT NULL,
  "learnerId" TEXT NOT NULL,
  "arabicWord" TEXT NOT NULL,
  "transliteration" TEXT,
  "root" TEXT,
  "meaning" TEXT NOT NULL,
  "explanation" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TafsirVocabulary_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Verse_surah_ayahNumber_key" ON "Verse"("surah", "ayahNumber");
CREATE INDEX "Verse_surah_ayahNumber_idx" ON "Verse"("surah", "ayahNumber");
CREATE UNIQUE INDEX "TafsirNote_learnerId_verseId_category_key" ON "TafsirNote"("learnerId", "verseId", "category");
CREATE INDEX "TafsirNote_learnerId_updatedAt_idx" ON "TafsirNote"("learnerId", "updatedAt");
CREATE INDEX "TafsirNote_verseId_idx" ON "TafsirNote"("verseId");
CREATE INDEX "TafsirVocabulary_learnerId_verseId_idx" ON "TafsirVocabulary"("learnerId", "verseId");
CREATE INDEX "TafsirVocabulary_verseId_idx" ON "TafsirVocabulary"("verseId");

ALTER TABLE "TafsirNote" ADD CONSTRAINT "TafsirNote_verseId_fkey" FOREIGN KEY ("verseId") REFERENCES "Verse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TafsirNote" ADD CONSTRAINT "TafsirNote_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "Learner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TafsirVocabulary" ADD CONSTRAINT "TafsirVocabulary_verseId_fkey" FOREIGN KEY ("verseId") REFERENCES "Verse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TafsirVocabulary" ADD CONSTRAINT "TafsirVocabulary_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "Learner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
