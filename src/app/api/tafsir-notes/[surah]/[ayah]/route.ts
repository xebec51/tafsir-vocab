import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureLearner } from "@/lib/learner";
import { prisma } from "@/lib/prisma";
import { documentCategories, getTafsirVerse, type TafsirDocument } from "@/lib/tafsir-notes";
import { getLearnerId } from "@/lib/session";

const shortText = z.string().max(500);
const longText = z.string().max(12000);
const documentSchema = z.object({
  translation: z.string().max(3000),
  theme: shortText,
  keywords: z.array(z.object({ arabic: shortText, meaning: shortText })).max(20),
  hasAsbab: z.enum(["unknown", "yes", "no"]),
  asbabBackground: longText,
  asbabNarration: longText,
  asbabSource: z.string().max(2000),
  asbabValidity: shortText,
  previousConnection: longText,
  nextConnection: longText,
  surahThemeConnection: longText,
  structureConnection: longText,
  summaryIndonesian: longText,
  englishExplanation: longText,
  references: z.record(z.string().max(120), z.string().max(5000)),
  interpretationPoints: longText,
  aqidahLessons: longText,
  moralLessons: longText,
  practicalApplication: longText,
  dawahPoints: longText,
  judgeQuestions: longText,
  modelAnswers: longText,
  presentationPhrases: longText,
  relatedVerses: longText,
  vocabulary: z.array(z.object({
    arabicWord: shortText,
    transliteration: shortText,
    root: shortText,
    meaning: shortText,
    explanation: z.string().max(3000)
  })).max(30)
});

function verseNumbers(params: { surah: string; ayah: string }) {
  return { surah: Number(params.surah), ayah: Number(params.ayah) };
}

function validVerseNumber(value: number, max: number) {
  return Number.isInteger(value) && value >= 1 && value <= max;
}

export async function GET(_request: Request, { params }: { params: Promise<{ surah: string; ayah: string }> }) {
  const numbers = verseNumbers(await params);
  if (!validVerseNumber(numbers.surah, 114) || !validVerseNumber(numbers.ayah, 300)) {
    return NextResponse.json({ error: "Invalid verse." }, { status: 400 });
  }
  const learnerId = await getLearnerId();
  const verse = await getTafsirVerse(numbers.surah, numbers.ayah, learnerId);
  return NextResponse.json(verse ?? { error: "Verse is not part of Juz 14." }, {
    status: verse ? 200 : 404,
    headers: { "Cache-Control": "private, no-store" }
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ surah: string; ayah: string }> }) {
  const numbers = verseNumbers(await params);
  if (!validVerseNumber(numbers.surah, 114) || !validVerseNumber(numbers.ayah, 300)) {
    return NextResponse.json({ error: "Invalid verse." }, { status: 400 });
  }
  const parsed = documentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "The notes contain invalid or overly long fields." }, { status: 400 });

  const occurrence = await prisma.wordOccurrence.findFirst({
    where: { surah: numbers.surah, ayah: numbers.ayah, page: { juzId: 14 } },
    orderBy: { wordPosition: "asc" },
    select: { contextArabic: true, arabic: true }
  });
  if (!occurrence) return NextResponse.json({ error: "Verse is not part of Juz 14." }, { status: 404 });

  const learnerId = await getLearnerId();
  await ensureLearner(learnerId);
  const document = parsed.data as TafsirDocument;
  const categories = documentCategories(document);

  await prisma.$transaction(async (transaction) => {
    const verse = await transaction.verse.upsert({
      where: { surah_ayahNumber: { surah: numbers.surah, ayahNumber: numbers.ayah } },
      update: { arabicText: occurrence.contextArabic ?? occurrence.arabic },
      create: { surah: numbers.surah, ayahNumber: numbers.ayah, arabicText: occurrence.contextArabic ?? occurrence.arabic }
    });
    for (const note of categories) {
      const reference = note.category === "tafsir_references"
        ? Object.entries(document.references).filter(([, value]) => value.trim()).map(([name]) => name).join(", ") || null
        : null;
      await transaction.tafsirNote.upsert({
        where: { learnerId_verseId_category: { learnerId, verseId: verse.id, category: note.category } },
        update: { content: note.content, reference },
        create: { learnerId, verseId: verse.id, category: note.category, content: note.content, reference }
      });
    }
    await transaction.tafsirVocabulary.deleteMany({ where: { learnerId, verseId: verse.id } });
    const vocabulary = document.vocabulary.filter((item) => item.arabicWord.trim() || item.meaning.trim());
    if (vocabulary.length) {
      await transaction.tafsirVocabulary.createMany({
        data: vocabulary.map((item) => ({
          learnerId, verseId: verse.id, arabicWord: item.arabicWord.trim(), transliteration: item.transliteration.trim() || null,
          root: item.root.trim() || null, meaning: item.meaning.trim(), explanation: item.explanation.trim() || null
        }))
      });
    }
  });

  return NextResponse.json({ saved: true }, { headers: { "Cache-Control": "private, no-store" } });
}
