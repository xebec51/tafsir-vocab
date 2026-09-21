import { prisma } from "@/lib/prisma";
import { ensureLearner } from "@/lib/learner";

export type DashboardData = {
  learner: { xp: number; streakDays: number };
  due: number;
  weak: number;
  mastered: number;
  pages: Array<{
    unitNumber: number;
    mushafPage: number;
    surahLabel: string | null;
    verseRange: string | null;
    wordCount: number;
    coreWordCount: number;
    progress: {
      masteryStars: number;
      completed: boolean;
      completedLessons: number;
      reviewedLessons: number;
      lessonCount: number;
      bestAccuracy: number;
    } | null;
  }>;
};

export async function getDashboardData(learnerId: string): Promise<DashboardData> {
  const now = new Date();
  const [learner, pages, due, weak, mastered] = await Promise.all([
    ensureLearner(learnerId),
    prisma.page.findMany({
      where: { juzId: 14 },
      orderBy: { unitNumber: "asc" },
      select: {
        unitNumber: true,
        mushafPage: true,
        surahLabel: true,
        verseRange: true,
        wordCount: true,
        coreWordCount: true,
        pageProgress: {
          where: { learnerId },
          take: 1,
          select: {
            masteryStars: true,
            completed: true,
            completedLessons: true,
            reviewedLessons: true,
            lessonCount: true,
            bestAccuracy: true
          }
        }
      }
    }),
    prisma.wordProgress.count({ where: { learnerId, nextReviewAt: { lte: now } } }),
    prisma.wordProgress.count({ where: { learnerId, wrongCount: { gt: 0 } } }),
    prisma.wordProgress.count({ where: { learnerId, masteryLevel: "MASTERED" } })
  ]);

  return {
    learner: { xp: learner.xp, streakDays: learner.streakDays },
    due,
    weak,
    mastered,
    pages: pages.map((page) => ({
      unitNumber: page.unitNumber,
      mushafPage: page.mushafPage,
      surahLabel: page.surahLabel,
      verseRange: page.verseRange,
      wordCount: page.wordCount,
      coreWordCount: page.coreWordCount,
      progress: page.pageProgress[0] ?? null
    }))
  };
}
