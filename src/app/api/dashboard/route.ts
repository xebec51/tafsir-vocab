import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureLearner } from "@/lib/learner";
import { getLearnerId } from "@/lib/session";

export async function GET() {
  const learnerId = await getLearnerId();
  const learner = await ensureLearner(learnerId);
  const [pages, due, weak, mastered] = await Promise.all([
    prisma.page.findMany({
      where: { juzId: 14 }, orderBy: { unitNumber: "asc" },
      include: { pageProgress: { where: { learnerId }, take: 1 } }
    }),
    prisma.wordProgress.count({ where: { learnerId, nextReviewAt: { lte: new Date() } } }),
    prisma.wordProgress.count({ where: { learnerId, wrongCount: { gt: 0 } } }),
    prisma.wordProgress.count({ where: { learnerId, masteryLevel: "MASTERED" } })
  ]);
  return NextResponse.json({
    learner: { xp: learner.xp, streakDays: learner.streakDays }, due, weak, mastered,
    pages: pages.map((page) => ({
      unitNumber: page.unitNumber, mushafPage: page.mushafPage,
      surahLabel: page.surahLabel, verseRange: page.verseRange,
      wordCount: page.wordCount, coreWordCount: page.coreWordCount,
      progress: page.pageProgress[0] ?? null
    }))
  });
}
