CREATE TABLE "TafsirPassage" (
  "id" TEXT NOT NULL,
  "learnerId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "theme" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TafsirPassage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TafsirPassageVerse" (
  "id" SERIAL NOT NULL,
  "passageId" TEXT NOT NULL,
  "verseId" INTEGER NOT NULL,
  "position" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TafsirPassageVerse_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TafsirPassageNote" (
  "id" SERIAL NOT NULL,
  "passageId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "content" JSONB NOT NULL,
  "reference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TafsirPassageNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TafsirPassageVocabulary" (
  "id" SERIAL NOT NULL,
  "passageId" TEXT NOT NULL,
  "arabicWord" TEXT NOT NULL,
  "transliteration" TEXT,
  "root" TEXT,
  "meaning" TEXT NOT NULL,
  "explanation" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TafsirPassageVocabulary_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TafsirPassageVerse_passageId_verseId_key" ON "TafsirPassageVerse"("passageId", "verseId");
CREATE UNIQUE INDEX "TafsirPassageVerse_passageId_position_key" ON "TafsirPassageVerse"("passageId", "position");
CREATE INDEX "TafsirPassageVerse_verseId_idx" ON "TafsirPassageVerse"("verseId");
CREATE UNIQUE INDEX "TafsirPassageNote_passageId_category_key" ON "TafsirPassageNote"("passageId", "category");
CREATE INDEX "TafsirPassageNote_passageId_updatedAt_idx" ON "TafsirPassageNote"("passageId", "updatedAt");
CREATE INDEX "TafsirPassageVocabulary_passageId_idx" ON "TafsirPassageVocabulary"("passageId");
CREATE INDEX "TafsirPassage_learnerId_updatedAt_idx" ON "TafsirPassage"("learnerId", "updatedAt");

ALTER TABLE "TafsirPassage" ADD CONSTRAINT "TafsirPassage_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "Learner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TafsirPassageVerse" ADD CONSTRAINT "TafsirPassageVerse_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES "TafsirPassage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TafsirPassageVerse" ADD CONSTRAINT "TafsirPassageVerse_verseId_fkey" FOREIGN KEY ("verseId") REFERENCES "Verse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TafsirPassageNote" ADD CONSTRAINT "TafsirPassageNote_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES "TafsirPassage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TafsirPassageVocabulary" ADD CONSTRAINT "TafsirPassageVocabulary_passageId_fkey" FOREIGN KEY ("passageId") REFERENCES "TafsirPassage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
