import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getLearnerId } from "@/lib/session";

export async function GET() {
  const learnerId = await getLearnerId();
  const rows = await prisma.wordProgress.findMany({
    where: {
      learnerId,
      correctCount: { gt: 0 },
      lexeme: { englishPrimary: { not: null } }
    },
    include: { lexeme: { include: { occurrences: { take: 1, orderBy: { id: "asc" } } } } },
    orderBy: [{ lastReviewedAt: "asc" }],
    take: 30
  });

  return NextResponse.json({ words: rows.flatMap((row) => {
    const occurrence = row.lexeme.occurrences[0];
    if (!occurrence || !row.lexeme.englishPrimary) return [];
    let alternatives: string[] = [];
    try { alternatives = JSON.parse(row.lexeme.englishAlternatives || "[]"); } catch {}
    return [{
      lexemeId: row.lexemeId,
      occurrenceId: occurrence.id,
      location: occurrence.location,
      verseKey: occurrence.verseKey,
      arabic: occurrence.arabic,
      lemma: row.lexeme.lemma,
      root: row.lexeme.root,
      partOfSpeech: row.lexeme.partOfSpeech,
      transliteration: occurrence.transliteration,
      english: row.lexeme.englishPrimary,
      alternatives: [...new Set([row.lexeme.englishPrimary, ...alternatives])],
      indonesian: row.lexeme.indonesian ?? occurrence.sourceIndonesian,
      contextArabic: occurrence.contextArabic,
      audioUrl: occurrence.audioUrl,
      courseStatus: row.lexeme.courseStatus,
      masteryLevel: row.masteryLevel
    }];
  }) });
}
