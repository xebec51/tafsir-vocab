ALTER TABLE "WordProgress" ADD COLUMN "weakReviewRequired" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "WordProgress" ADD COLUMN "weakReviewPassed" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "WordProgress_learnerId_weakReviewRequired_idx" ON "WordProgress"("learnerId", "weakReviewRequired");
