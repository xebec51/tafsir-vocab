export function advanceMasteryQueue<T>(queue: T[], correct: boolean): T[] {
  if (!queue.length) return queue;
  const [current, ...remaining] = queue;
  return correct ? remaining : [...remaining, current];
}

export function shuffleReviewQueue<T>(items: T[], random: () => number = Math.random): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.max(0, Math.min(.999999999, random())) * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
}
