UPDATE "WordProgress"
SET
  "intervalDays" = 0,
  "nextReviewAt" = CURRENT_TIMESTAMP
WHERE
  "intervalDays" < 0
  OR "intervalDays" > 3650
  OR "nextReviewAt" < TIMESTAMP '2000-01-01'
  OR "nextReviewAt" > CURRENT_TIMESTAMP + INTERVAL '10 years';
