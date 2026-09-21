import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getLearnerId } from "@/lib/session";

const Body = z.object({
  unitNumber: z.number().int().min(1).max(20),
  lesson: z.number().int().positive(),
  lessonCount: z.number().int().positive(),
  correct: z.number().int().nonnegative(),
  total: z.number().int().positive()
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid lesson review." }, { status: 400 });

  const learnerId = await getLearnerId();
  const page = await prisma.page.findUniqueOrThrow({
    where: { juzId_unitNumber: { juzId: 14, unitNumber: parsed.data.unitNumber } }
  });
  const actualLessonCount = Math.max(1, Math.ceil(page.coreWordCount / 6));
  if (parsed.data.lessonCount !== actualLessonCount || parsed.data.lesson > actualLessonCount) {
    return NextResponse.json({ error: "Lesson review sequence is invalid." }, { status: 409 });
  }

  const progress = await prisma.pageProgress.findUnique({
    where: { learnerId_pageId: { learnerId, pageId: page.id } }
  });
  if (!progress || parsed.data.lesson > progress.completedLessons) {
    return NextResponse.json({ error: "Complete this lesson before reviewing it." }, { status: 409 });
  }
  if (parsed.data.lesson > progress.reviewedLessons + 1) {
    return NextResponse.json({ error: "Complete the previous lesson review first." }, { status: 409 });
  }

  const accuracy = Math.min(1, parsed.data.correct / parsed.data.total);
  if (accuracy < 0.6) {
    return NextResponse.json({ error: "Review accuracy must be at least 60%." }, { status: 409 });
  }

  const reviewedLessons = Math.max(progress.reviewedLessons, parsed.data.lesson);
  const completed = progress.completed || reviewedLessons >= actualLessonCount;
  await prisma.pageProgress.update({
    where: { id: progress.id },
    data: { reviewedLessons, completed, lastStudiedAt: new Date() }
  });

  return NextResponse.json({ reviewedLessons, completed, accuracy });
}
