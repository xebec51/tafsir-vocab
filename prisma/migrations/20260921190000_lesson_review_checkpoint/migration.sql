ALTER TABLE "PageProgress"
ADD COLUMN "reviewedLessons" INTEGER NOT NULL DEFAULT 0;

UPDATE "PageProgress"
SET "reviewedLessons" = CASE
  WHEN "completed" THEN "completedLessons"
  ELSE GREATEST("completedLessons" - 1, 0)
END;
