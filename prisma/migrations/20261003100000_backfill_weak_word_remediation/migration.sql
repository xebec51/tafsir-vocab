UPDATE "WordProgress"
SET "weakReviewRequired" = 3,
    "weakReviewPassed" = 0
WHERE "wrongCount" > 0
  AND "weakReviewRequired" = 0;
