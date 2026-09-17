export type MasteryLevel = "NEW" | "LEARNING" | "FAMILIAR" | "STRONG" | "MASTERED";

export function masteryFromProgress(input: {
  correctCount: number;
  wrongCount: number;
  streakCorrect: number;
  intervalDays: number;
}): MasteryLevel {
  const { correctCount, wrongCount, streakCorrect, intervalDays } = input;
  if (correctCount === 0) return "NEW";
  if (correctCount >= 10 && streakCorrect >= 4 && intervalDays >= 14) return "MASTERED";
  if (correctCount >= 7 && streakCorrect >= 3 && intervalDays >= 7) return "STRONG";
  if (correctCount >= 4 && streakCorrect >= 2 && wrongCount <= correctCount) return "FAMILIAR";
  return "LEARNING";
}

export function starsForAccuracy(accuracy: number) {
  if (accuracy >= 0.9) return 3;
  if (accuracy >= 0.75) return 2;
  if (accuracy >= 0.6) return 1;
  return 0;
}
