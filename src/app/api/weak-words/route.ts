import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLearnerId } from "@/lib/session";

export async function GET() {
  const learnerId = await getLearnerId();
  const rows = await prisma.wordProgress.findMany({
    where: { learnerId, weakReviewRequired: { gt: 0 } },
    include: { lexeme: { include: { occurrences: { take: 1, orderBy: { id: "asc" } } } } },
    orderBy: [{ weakReviewPassed: "asc" }, { wrongCount: "desc" }],
    take: 100
  });
  return NextResponse.json({
    words: rows.filter((row) => row.weakReviewPassed < row.weakReviewRequired).map((row) => ({
      lexemeId: row.lexemeId,
      arabic: row.lexeme.occurrences[0]?.arabic ?? row.lexeme.arabicDisplay,
      english: row.lexeme.englishPrimary,
      root: row.lexeme.root,
      correctCount: row.correctCount,
      wrongCount: row.wrongCount,
      weakReviewRequired: row.weakReviewRequired,
      weakReviewPassed: row.weakReviewPassed,
      masteryLevel: row.masteryLevel,
      verseKey: row.lexeme.occurrences[0]?.verseKey ?? null
    }))
  });
}
