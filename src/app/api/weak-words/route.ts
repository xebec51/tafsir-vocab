import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLearnerId } from "@/lib/session";

export async function GET() {
  const learnerId = await getLearnerId();
  const rows = await prisma.wordProgress.findMany({
    where: { learnerId, wrongCount: { gt: 0 } },
    include: { lexeme: { include: { occurrences: { take: 1, orderBy: { id: "asc" } } } } },
    orderBy: [{ wrongCount: "desc" }, { correctCount: "asc" }],
    take: 50
  });
  return NextResponse.json({
    words: rows.map((row) => ({
      lexemeId: row.lexemeId,
      arabic: row.lexeme.occurrences[0]?.arabic ?? row.lexeme.arabicDisplay,
      english: row.lexeme.englishPrimary,
      root: row.lexeme.root,
      correctCount: row.correctCount,
      wrongCount: row.wrongCount,
      masteryLevel: row.masteryLevel,
      verseKey: row.lexeme.occurrences[0]?.verseKey ?? null
    }))
  });
}
