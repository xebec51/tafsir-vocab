import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ juz: string; unit: string }> }
) {
  const { juz, unit } = await params;
  const juzNumber = Number(juz);
  const unitNumber = Number(unit);

  if (juzNumber !== 14 || !Number.isInteger(unitNumber) || unitNumber < 1 || unitNumber > 20) {
    return NextResponse.json({ error: "Unit not found." }, { status: 404 });
  }

  const page = await prisma.page.findUnique({
    where: {
      juzId_unitNumber: {
        juzId: 14,
        unitNumber
      }
    },
    include: {
      occurrences: {
        include: { lexeme: true },
        orderBy: [
          { surah: "asc" },
          { ayah: "asc" },
          { wordPosition: "asc" }
        ]
      }
    }
  });

  if (!page) {
    return NextResponse.json({ error: "Page not seeded." }, { status: 404 });
  }

  return NextResponse.json({
    unit: {
      unitNumber: page.unitNumber,
      mushafPage: page.mushafPage,
      surahLabel: page.surahLabel,
      verseRange: page.verseRange,
      wordCount: page.wordCount,
      coreWordCount: page.coreWordCount
    },
    words: page.occurrences.map((occurrence) => ({
      lexemeId: occurrence.lexeme.id,
      occurrenceId: occurrence.id,
      location: occurrence.location,
      verseKey: occurrence.verseKey,
      arabic: occurrence.arabic,
      transliteration: occurrence.transliteration,
      sourceEnglish: occurrence.sourceEnglish,
      sourceIndonesian: occurrence.sourceIndonesian,
      lemma: occurrence.lexeme.lemma,
      root: occurrence.lexeme.root,
      partOfSpeech: occurrence.lexeme.partOfSpeech,
      englishPrimary: occurrence.lexeme.englishPrimary,
      englishAlternatives: JSON.parse(
        occurrence.lexeme.englishAlternatives || "[]"
      ),
      indonesian: occurrence.lexeme.indonesian,
      courseStatus: occurrence.lexeme.courseStatus,
      reviewStatus: occurrence.lexeme.reviewStatus,
      contextArabic: occurrence.contextArabic
    }))
  });
}
