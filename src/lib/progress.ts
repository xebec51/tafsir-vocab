import type { WordProgress } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureLearner, nextStreak } from "@/lib/learner";
import { masteryFromProgress } from "@/lib/mastery";
import { nextReview, type ReviewQuality } from "@/lib/srs";

export type AttemptInput = {
  lexemeId: number;
  occurrenceId?: number;
  exerciseType: string;
  correct: boolean;
  response?: string;
  responseTimeMs?: number;
};

type ProgressState = Pick<WordProgress,
  "correctCount" | "wrongCount" | "streakCorrect" | "easeFactor" |
  "intervalDays" | "averageResponseMs" | "masteryLevel" | "nextReviewAt"
>;

export function advanceWordProgress(
  previous: ProgressState | undefined,
  attempt: Pick<AttemptInput, "correct" | "responseTimeMs">,
  now = new Date()
): ProgressState {
  const quality: ReviewQuality = attempt.correct
    ? ((attempt.responseTimeMs ?? 9999) <= 8000 ? 5 : 4)
    : 1;
  const schedule = nextReview({
    quality,
    intervalDays: previous?.intervalDays ?? 0,
    easeFactor: previous?.easeFactor ?? 2.5,
    now
  });
  const correctCount = (previous?.correctCount ?? 0) + (attempt.correct ? 1 : 0);
  const wrongCount = (previous?.wrongCount ?? 0) + (attempt.correct ? 0 : 1);
  const streakCorrect = attempt.correct ? (previous?.streakCorrect ?? 0) + 1 : 0;
  const oldAverage = previous?.averageResponseMs;
  const responseTime = attempt.responseTimeMs ?? oldAverage ?? null;
  const averageResponseMs = responseTime == null
    ? null
    : oldAverage == null ? responseTime : Math.round((oldAverage + responseTime) / 2);
  const masteryLevel = masteryFromProgress({
    correctCount,
    wrongCount,
    streakCorrect,
    intervalDays: schedule.intervalDays
  });

  return {
    correctCount,
    wrongCount,
    streakCorrect,
    easeFactor: schedule.easeFactor,
    intervalDays: schedule.intervalDays,
    averageResponseMs,
    masteryLevel,
    nextReviewAt: schedule.nextReviewAt
  };
}

export async function recordAttempts(learnerId: string, attempts: AttemptInput[]) {
  const learner = await ensureLearner(learnerId);
  const lexemeIds = [...new Set(attempts.map((attempt) => attempt.lexemeId))];
  const existing = await prisma.wordProgress.findMany({
    where: { learnerId, lexemeId: { in: lexemeIds } }
  });
  const states = new Map<number, ProgressState>(existing.map((progress) => [progress.lexemeId, progress]));
  const now = new Date();

  for (const attempt of attempts) {
    states.set(attempt.lexemeId, advanceWordProgress(states.get(attempt.lexemeId), attempt, now));
  }

  const xpAwarded = attempts.reduce((total, attempt) => total + (attempt.correct ? 10 : 2), 0);
  const tafsirAttempts = attempts.filter((attempt) => attempt.exerciseType === "TAFSIR_EXPLANATION");

  await prisma.$transaction([
    ...[...states].map(([lexemeId, state]) => prisma.wordProgress.upsert({
      where: { learnerId_lexemeId: { learnerId, lexemeId } },
      update: {
        ...state,
        lastReviewedAt: now
      },
      create: {
        learnerId,
        lexemeId,
        ...state,
        lastReviewedAt: now
      }
    })),
    prisma.attempt.createMany({
      data: attempts.map((attempt) => ({
        learnerId,
        lexemeId: attempt.lexemeId,
        occurrenceId: attempt.occurrenceId,
        exerciseType: attempt.exerciseType,
        correct: attempt.correct,
        response: attempt.response,
        responseTimeMs: attempt.responseTimeMs,
        xpAwarded: attempt.correct ? 10 : 2
      }))
    }),
    prisma.learner.update({
      where: { id: learnerId },
      data: {
        xp: { increment: xpAwarded },
        streakDays: nextStreak(learner.lastStudyDate, learner.streakDays),
        lastStudyDate: now,
        ...(tafsirAttempts.length ? {
          tafsirAttempts: { increment: tafsirAttempts.length },
          tafsirSuccessful: { increment: tafsirAttempts.filter((attempt) => attempt.correct).length }
        } : {})
      }
    })
  ]);

  const last = states.get(attempts.at(-1)?.lexemeId ?? -1);
  return { xpAwarded, masteryLevel: last?.masteryLevel, nextReviewAt: last?.nextReviewAt };
}
