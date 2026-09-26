export type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5;

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_INTERVAL_DAYS = 3650;

function safeIntervalDays(value: number) {
  return Number.isFinite(value) && value >= 0 && value <= MAX_INTERVAL_DAYS
    ? Math.round(value)
    : 0;
}

function safeEaseFactor(value: number) {
  return Number.isFinite(value) && value >= 1.3 && value <= 3.5 ? value : 2.5;
}

export function nextReview({
  quality,
  intervalDays,
  easeFactor,
  now = new Date()
}: {
  quality: ReviewQuality;
  intervalDays: number;
  easeFactor: number;
  now?: Date;
}) {
  const safeNow = Number.isFinite(now.getTime()) ? new Date(now.getTime()) : new Date();
  let nextEase = safeEaseFactor(easeFactor);
  let nextInterval = safeIntervalDays(intervalDays);
  const nextReviewAt = new Date(safeNow);

  if (quality < 3) {
    // Failed retrievals return quickly while the memory trace is still active.
    nextInterval = 0;
    nextReviewAt.setTime(nextReviewAt.getTime() + 10 * 60 * 1000);
  } else {
    if (nextInterval <= 0) nextInterval = 1;
    else if (nextInterval === 1) nextInterval = 3;
    else nextInterval = Math.min(MAX_INTERVAL_DAYS, Math.max(1, Math.round(nextInterval * nextEase)));

    nextEase =
      nextEase +
      (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    nextEase = Math.min(3.5, Math.max(1.3, nextEase));
    nextReviewAt.setTime(safeNow.getTime() + nextInterval * DAY_MS);
  }

  return {
    intervalDays: nextInterval,
    easeFactor: Number(nextEase.toFixed(2)),
    nextReviewAt
  };
}
