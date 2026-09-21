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
  const [learner, page] = await Promise.all([
    ensureLearner(learnerId),
    prisma.page.findUniqueOrThrow({
      where: { juzId_unitNumber: { juzId: 14, unitNumber: parsed.data.unitNumber } }
    })
  ]);
  const actualLessonCount = Math.max(1, Math.ceil(page.coreWordCount / 6));
  if (parsed.data.lessonCount !== actualLessonCount || parsed.data.lesson > actualLessonCount) {
    return NextResponse.json({ error: "Lesson sequence is invalid." }, { status: 409 });
  }
  const accuracy = Math.min(1, parsed.data.correct / parsed.data.total);
  const stars = starsForAccuracy(accuracy);
  const existing = await prisma.pageProgress.findUnique({
    where: { learnerId_pageId: { learnerId, pageId: page.id } }
  });
  const highestAccessibleLesson = Math.min(actualLessonCount, (existing?.completedLessons ?? 0) + 1);
  if (parsed.data.lesson > highestAccessibleLesson) {
    return NextResponse.json({ error: "Complete the previous lesson first." }, { status: 409 });
  }
  const passed = accuracy >= 0.6;
  const bestAccuracy = Math.max(existing?.bestAccuracy ?? 0, accuracy);
  const masteryStars = Math.max(existing?.masteryStars ?? 0, stars);
  const completedLessons = passed
    ? Math.max(existing?.completedLessons ?? 0, parsed.data.lesson)
    : existing?.completedLessons ?? 0;
  const lessonCount = actualLessonCount;
  const isFinalLesson = parsed.data.lesson >= parsed.data.lessonCount;
  const completed = (existing?.completed ?? false) || (isFinalLesson && passed);
  const bonus = passed ? (isFinalLesson ? 25 : 5) : 0;

  await prisma.$transaction([
    prisma.pageProgress.upsert({
      where: { learnerId_pageId: { learnerId, pageId: page.id } },
      update: {
        masteryStars, completed, completedLessons, lessonCount, bestAccuracy,
        sessions: { increment: 1 }, lastStudiedAt: new Date()
      },
      create: {
        learnerId, pageId: page.id,
        masteryStars, completed, completedLessons, lessonCount, bestAccuracy, sessions: 1, lastStudiedAt: new Date()
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

  return NextResponse.json({ accuracy, masteryStars, completed, completedLessons, lessonCount, bonus, passed });
}
