import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ensureLearner, nextStreak } from "@/lib/learner";
import { getLearnerId } from "@/lib/session";
import { starsForAccuracy } from "@/lib/mastery";

const Body = z.object({
  unitNumber: z.number().int().min(1).max(20),
  correct: z.number().int().nonnegative(),
  total: z.number().int().positive(),
  lesson: z.number().int().positive(),
  lessonCount: z.number().int().positive()
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid session." }, { status: 400 });
  const learnerId = await getLearnerId();
  const learner = await ensureLearner(learnerId);
  const page = await prisma.page.findUniqueOrThrow({
    where: { juzId_unitNumber: { juzId: 14, unitNumber: parsed.data.unitNumber } }
  });
  const accuracy = Math.min(1, parsed.data.correct / parsed.data.total);
  const stars = starsForAccuracy(accuracy);
  const existing = await prisma.pageProgress.findUnique({
    where: { learnerId_pageId: { learnerId, pageId: page.id } }
  });
  const bestAccuracy = Math.max(existing?.bestAccuracy ?? 0, accuracy);
  const masteryStars = Math.max(existing?.masteryStars ?? 0, stars);
  const isFinalLesson = parsed.data.lesson >= parsed.data.lessonCount;
  const completed = (existing?.completed ?? false) || (isFinalLesson && accuracy >= 0.6);
  const bonus = isFinalLesson && accuracy >= 0.6 ? 25 : 5;

  await prisma.$transaction([
    prisma.pageProgress.upsert({
      where: { learnerId_pageId: { learnerId, pageId: page.id } },
      update: {
        masteryStars, completed, bestAccuracy,
        sessions: { increment: 1 }, lastStudiedAt: new Date()
      },
      create: {
        learnerId, pageId: page.id,
        masteryStars, completed, bestAccuracy, sessions: 1, lastStudiedAt: new Date()
      }
    }),
    prisma.learner.update({
      where: { id: learnerId },
      data: {
        xp: { increment: bonus },
        streakDays: nextStreak(learner.lastStudyDate, learner.streakDays),
        lastStudyDate: new Date()
      }
    })
  ]);

  return NextResponse.json({ accuracy, masteryStars, completed, bonus });
}
