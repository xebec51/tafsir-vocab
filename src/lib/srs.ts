export type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5;

export function nextReview({
  quality,
  intervalDays,
  easeFactor
}: {
  quality: ReviewQuality;
  intervalDays: number;
  easeFactor: number;
}) {
  let nextEase = easeFactor;
  let nextInterval = intervalDays;

  if (quality < 3) {
    nextInterval = 1;
  } else {
    if (intervalDays <= 0) nextInterval = 1;
    else if (intervalDays === 1) nextInterval = 3;
    else nextInterval = Math.max(1, Math.round(intervalDays * easeFactor));

    nextEase =
      easeFactor +
      (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

    nextEase = Math.max(1.3, nextEase);
  }

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + nextInterval);

  return {
    intervalDays: nextInterval,
    easeFactor: Number(nextEase.toFixed(2)),
    nextReviewAt
  };
}
