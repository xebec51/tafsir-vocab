import { prisma } from "@/lib/prisma";
import { sentenceStatus } from "@/lib/sentence-quiz";

export async function sentencePageSummaries(learnerId: string) {
  const pages = await prisma.page.findMany({ where: { juzId: 14, mushafPage: { gte: 262, lte: 281 } }, orderBy: { mushafPage: "asc" }, select: {
    mushafPage: true, surahLabel: true, verseRange: true,
    sentenceSegments: { where: { curationStatus: { not: "ARCHIVED" } }, select: { curationStatus: true, progresses: { where: { learnerId }, select: { correctCount: true, wrongCount: true, completedAt: true, nextReviewAt: true, masteryLevel: true } } } }
  } });
  return pages.map((page) => {
    const ready = page.sentenceSegments.filter((segment) => segment.curationStatus === "READY");
    const progresses = ready.flatMap((segment) => segment.progresses);
    const completed = progresses.filter((progress) => progress.completedAt).length;
    const due = progresses.filter((progress) => sentenceStatus(progress) === "Needs Review").length;
    const correct = progresses.reduce((total, progress) => total + progress.correctCount, 0);
    const attempts = correct + progresses.reduce((total, progress) => total + progress.wrongCount, 0);
    const levels: Record<string, number> = { NEW: 0, LEARNING: 25, FAMILIAR: 50, STRONG: 75, MASTERED: 100 };
    return { page: page.mushafPage, surah: page.surahLabel, range: page.verseRange, total: ready.length, pending: page.sentenceSegments.length - ready.length, completed, due,
      accuracy: attempts ? Math.round(correct / attempts * 100) : 0, mastery: ready.length ? Math.round(progresses.reduce((total, progress) => total + (levels[progress.masteryLevel] ?? 0), 0) / ready.length) : 0, progress: ready.length ? Math.round(completed / ready.length * 100) : 0,
      status: due ? "Needs Review" : ready.length && completed === ready.length ? "Completed" : progresses.length ? "In Progress" : "Not Started" };
  });
}
export async function sentencePageDetail(page: number, learnerId: string) {
  return prisma.page.findUnique({ where: { juzId_mushafPage: { juzId: 14, mushafPage: page } }, select: {
    mushafPage: true, surahLabel: true, verseRange: true,
    sentenceSegments: { where: { curationStatus: { not: "ARCHIVED" } }, orderBy: { segmentOrder: "asc" }, include: {
      verse: { select: { surah: true, ayahNumber: true } }, progresses: { where: { learnerId } },
      attempts: { where: { learnerId }, orderBy: { createdAt: "desc" }, take: 3, select: { correct: true, createdAt: true, session: { select: { mode: true } } } }
    } }
  } });
}
