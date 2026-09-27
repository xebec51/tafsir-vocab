export function advanceMasteryQueue<T>(queue: T[], correct: boolean): T[] {
  if (!queue.length) return queue;
  const [current, ...remaining] = queue;
  return correct ? remaining : [...remaining, current];
}
