export const MAX_ALL_REVIEW_SESSION_SIZE = 100;

export type ReviewSessionPlan = {
  number: number;
  offset: number;
  size: number;
};

export function allReviewSessionPlan(totalWords: number): ReviewSessionPlan[] {
  if (totalWords <= 0) return [];
  const sessionCount = Math.ceil(totalWords / MAX_ALL_REVIEW_SESSION_SIZE);
  const baseSize = Math.floor(totalWords / sessionCount);
  const extraWords = totalWords % sessionCount;
  let offset = 0;
  return Array.from({ length: sessionCount }, (_, index) => {
    const size = baseSize + (index < extraWords ? 1 : 0);
    const session = { number: index + 1, offset, size };
    offset += size;
    return session;
  });
}
