import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensureLearner, nextStreak } from "@/lib/learner";
import { getLearnerId } from "@/lib/session";
import { masteryFromProgress } from "@/lib/mastery";
import { nextReview, type ReviewQuality } from "@/lib/srs";

const Body = z.object({
  lexemeId: z.number().int().positive(),
  occurrenceId: z.number().int().positive().optional(),
  exerciseType: z.string().min(1).max(50),
  correct: z.boolean(),
  response: z.string().max(1000).optional(),
  responseTimeMs: z.number().int().nonnegative().max(600000).optional()
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid attempt." }, { status: 400 });

  const body = parsed.data;
  const learnerId = await getLearnerId();
  const learner = await ensureLearner(learnerId);
  const existing = await prisma.wordProgress.findUnique({
    where: { learnerId_lexemeId: { learnerId, lexemeId: body.lexemeId } }
  });

  const quality: ReviewQuality = body.correct
    ? ((body.responseTimeMs ?? 9999) <= 8000 ? 5 : 4)
    : 1;
  const schedule = nextReview({
    quality,
    intervalDays: existing?.intervalDays ?? 0,
    easeFactor: existing?.easeFactor ?? 2.5
  });

  const correctCount = (existing?.correctCount ?? 0) + (body.correct ? 1 : 0);
  const wrongCount = (existing?.wrongCount ?? 0) + (body.correct ? 0 : 1);
  const streakCorrect = body.correct ? (existing?.streakCorrect ?? 0) + 1 : 0;
  const avg = existing?.averageResponseMs;
  const responseTime = body.responseTimeMs ?? avg ?? null;
  const averageResponseMs = responseTime == null
    ? null
    : avg == null ? responseTime : Math.round((avg + responseTime) / 2);
  const masteryLevel = masteryFromProgress({
    correctCount, wrongCount, streakCorrect, intervalDays: schedule.intervalDays
  });
  const xpAwarded = body.correct ? 10 : 2;

  await prisma.$transaction([
    prisma.wordProgress.upsert({
      where: { learnerId_lexemeId: { learnerId, lexemeId: body.lexemeId } },
      update: {
        correctCount, wrongCount, streakCorrect,
        easeFactor: schedule.easeFactor,
        intervalDays: schedule.intervalDays,
        lastReviewedAt: new Date(),
        nextReviewAt: schedule.nextReviewAt,
        averageResponseMs,
        masteryLevel
      },
      create: {
        learnerId,
        lexemeId: body.lexemeId,
        correctCount, wrongCount, streakCorrect,
        easeFactor: schedule.easeFactor,
        intervalDays: schedule.intervalDays,
        lastReviewedAt: new Date(),
        nextReviewAt: schedule.nextReviewAt,
        averageResponseMs,
        masteryLevel
      }
    }),
    prisma.attempt.create({
      data: {
        learnerId,
        lexemeId: body.lexemeId,
        occurrenceId: body.occurrenceId,
        exerciseType: body.exerciseType,
        correct: body.correct,
        response: body.response,
        responseTimeMs: body.responseTimeMs,
        xpAwarded
      }
    }),
    prisma.learner.update({
      where: { id: learnerId },
      data: {
        xp: { increment: xpAwarded },
        streakDays: nextStreak(learner.lastStudyDate, learner.streakDays),
        lastStudyDate: new Date(),
        ...(body.exerciseType === "TAFSIR_EXPLANATION" ? {
          tafsirAttempts: { increment: 1 },
          tafsirSuccessful: { increment: body.correct ? 1 : 0 }
        } : {})
      }
    })
  ]);

  return NextResponse.json({ xpAwarded, masteryLevel, nextReviewAt: schedule.nextReviewAt });
}
