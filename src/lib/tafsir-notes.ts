import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const TAFSIR_CATEGORIES = [
  "ayat_information",
  "asbabun_nuzul",
  "munasabah",
  "tafsir_summary",
  "english_explanation",
  "tafsir_references",
  "key_interpretation_points",
  "lessons",
  "competition_note"
] as const;

export type TafsirCategory = (typeof TAFSIR_CATEGORIES)[number];

export type TafsirVocabularyInput = {
  arabicWord: string;
  transliteration: string;
  root: string;
  meaning: string;
  explanation: string;
};

export type TafsirDocument = {
  translation: string;
  theme: string;
  keywords: Array<{ arabic: string; meaning: string }>;
  hasAsbab: "unknown" | "yes" | "no";
  asbabBackground: string;
  asbabNarration: string;
  asbabSource: string;
  asbabValidity: string;
  previousConnection: string;
  nextConnection: string;
  surahThemeConnection: string;
  structureConnection: string;
  summaryIndonesian: string;
  englishExplanation: string;
  references: Record<string, string>;
  interpretationPoints: string;
  aqidahLessons: string;
  moralLessons: string;
  practicalApplication: string;
  dawahPoints: string;
  judgeQuestions: string;
  modelAnswers: string;
  presentationPhrases: string;
  relatedVerses: string;
  vocabulary: TafsirVocabularyInput[];
};

export const REFERENCE_NAMES = ["Tafsir Ibn Kathir", "Tafsir Al-Muyassar", "Tafsir As-Sa'di", "Tafsir At-Tabari", "Tafsir Al-Qurthubi", "Other references"] as const;

export function emptyTafsirDocument(): TafsirDocument {
  return {
    translation: "", theme: "", keywords: [], hasAsbab: "unknown",
    asbabBackground: "", asbabNarration: "", asbabSource: "", asbabValidity: "",
    previousConnection: "", nextConnection: "", surahThemeConnection: "", structureConnection: "",
    summaryIndonesian: "", englishExplanation: "",
    references: Object.fromEntries(REFERENCE_NAMES.map((name) => [name, ""])),
    interpretationPoints: "", aqidahLessons: "", moralLessons: "", practicalApplication: "", dawahPoints: "",
    judgeQuestions: "", modelAnswers: "", presentationPhrases: "", relatedVerses: "", vocabulary: []
  };
}

function objectValue(value: Prisma.JsonValue): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function hasMeaningfulNoteContent(value: unknown): boolean {
  if (typeof value === "string") return Boolean(value.trim()) && value !== "unknown";
  if (Array.isArray(value)) return value.some(hasMeaningfulNoteContent);
  if (value && typeof value === "object") return Object.values(value).some(hasMeaningfulNoteContent);
  return false;
}

export function categoriesToDocument(
  notes: Array<{ category: string; content: Prisma.JsonValue }>,
  translation: string | null,
  vocabulary: TafsirVocabularyInput[]
): TafsirDocument {
  const document = emptyTafsirDocument();
  document.translation = translation ?? "";
  document.vocabulary = vocabulary;
  const byCategory = new Map(notes.map((note) => [note.category, objectValue(note.content)]));
  const info = byCategory.get("ayat_information") ?? {};
  document.translation = text(info.translation) || document.translation;
  document.theme = text(info.theme);
  document.keywords = Array.isArray(info.keywords)
    ? info.keywords.flatMap((item) => {
      const row = item && typeof item === "object" && !Array.isArray(item) ? item as Record<string, unknown> : {};
      return text(row.arabic) || text(row.meaning) ? [{ arabic: text(row.arabic), meaning: text(row.meaning) }] : [];
    })
    : [];
  const asbab = byCategory.get("asbabun_nuzul") ?? {};
  document.hasAsbab = asbab.hasAsbab === "yes" || asbab.hasAsbab === "no" ? asbab.hasAsbab : "unknown";
  document.asbabBackground = text(asbab.background);
  document.asbabNarration = text(asbab.narration);
  document.asbabSource = text(asbab.source);
  document.asbabValidity = text(asbab.validity);
  const munasabah = byCategory.get("munasabah") ?? {};
  document.previousConnection = text(munasabah.previous);
  document.nextConnection = text(munasabah.next);
  document.surahThemeConnection = text(munasabah.surahTheme);
  document.structureConnection = text(munasabah.structure);
  document.summaryIndonesian = text((byCategory.get("tafsir_summary") ?? {}).indonesian);
  document.englishExplanation = text((byCategory.get("english_explanation") ?? {}).english);
  const references = (byCategory.get("tafsir_references") ?? {}).references;
  if (references && typeof references === "object" && !Array.isArray(references)) {
    document.references = { ...document.references, ...Object.fromEntries(Object.entries(references).map(([key, value]) => [key, text(value)])) };
  }
  document.interpretationPoints = text((byCategory.get("key_interpretation_points") ?? {}).points);
  const lessons = byCategory.get("lessons") ?? {};
  document.aqidahLessons = text(lessons.aqidah);
  document.moralLessons = text(lessons.moral);
  document.practicalApplication = text(lessons.practical);
  document.dawahPoints = text(lessons.dawah);
  const competition = byCategory.get("competition_note") ?? {};
  document.judgeQuestions = text(competition.questions);
  document.modelAnswers = text(competition.answers);
  document.presentationPhrases = text(competition.phrases);
  document.relatedVerses = text(competition.connections);
  return document;
}

export function documentCategories(document: TafsirDocument): Array<{ category: TafsirCategory; content: Prisma.InputJsonValue }> {
  return [
    { category: "ayat_information", content: { translation: document.translation, theme: document.theme, keywords: document.keywords } },
    { category: "asbabun_nuzul", content: { hasAsbab: document.hasAsbab, background: document.asbabBackground, narration: document.asbabNarration, source: document.asbabSource, validity: document.asbabValidity } },
    { category: "munasabah", content: { previous: document.previousConnection, next: document.nextConnection, surahTheme: document.surahThemeConnection, structure: document.structureConnection } },
    { category: "tafsir_summary", content: { indonesian: document.summaryIndonesian } },
    { category: "english_explanation", content: { english: document.englishExplanation } },
    { category: "tafsir_references", content: { references: document.references } },
    { category: "key_interpretation_points", content: { points: document.interpretationPoints } },
    { category: "lessons", content: { aqidah: document.aqidahLessons, moral: document.moralLessons, practical: document.practicalApplication, dawah: document.dawahPoints } },
    { category: "competition_note", content: { questions: document.judgeQuestions, answers: document.modelAnswers, phrases: document.presentationPhrases, connections: document.relatedVerses } }
  ];
}

export function surahName(surah: number) {
  if (surah === 15) return "Al-Hijr";
  if (surah === 16) return "An-Nahl";
  return `Surah ${surah}`;
}

export async function getTafsirVerse(surah: number, ayah: number, learnerId: string) {
  const [occurrences, savedVerse] = await Promise.all([
    prisma.wordOccurrence.findMany({
      where: { surah, ayah, page: { juzId: 14 } },
      orderBy: { wordPosition: "asc" },
      select: {
        contextArabic: true, arabic: true, transliteration: true,
        lexeme: { select: { id: true, root: true, englishPrimary: true } }
      }
    }),
    prisma.verse.findUnique({
      where: { surah_ayahNumber: { surah, ayahNumber: ayah } },
      include: {
        notes: { where: { learnerId }, orderBy: { category: "asc" } },
        vocabulary: { where: { learnerId }, orderBy: { id: "asc" } }
      }
    })
  ]);
  if (!occurrences.length) return null;
  const arabicText = occurrences.find((item) => item.contextArabic)?.contextArabic ?? occurrences.map((item) => item.arabic).join(" ");
  const seen = new Set<number>();
  const suggestedVocabulary = occurrences.flatMap((item) => {
    if (seen.has(item.lexeme.id) || !item.lexeme.englishPrimary) return [];
    seen.add(item.lexeme.id);
    return [{
      arabicWord: item.arabic,
      transliteration: item.transliteration ?? "",
      root: item.lexeme.root ?? "",
      meaning: item.lexeme.englishPrimary,
      explanation: ""
    }];
  });
  const savedVocabulary = savedVerse?.vocabulary.map((item) => ({
    arabicWord: item.arabicWord, transliteration: item.transliteration ?? "", root: item.root ?? "",
    meaning: item.meaning, explanation: item.explanation ?? ""
  })) ?? [];
  return {
    surah, ayah, surahName: surahName(surah), arabicText,
    document: categoriesToDocument(savedVerse?.notes ?? [], savedVerse?.translation ?? null, savedVocabulary.length ? savedVocabulary : suggestedVocabulary),
    hasSavedNotes: Boolean(savedVerse?.notes.length || savedVerse?.vocabulary.length)
  };
}

export async function getTafsirVerseIndex(learnerId: string) {
  const [occurrences, notes] = await Promise.all([
    prisma.wordOccurrence.findMany({
      where: { page: { juzId: 14 } },
      distinct: ["surah", "ayah"],
      orderBy: [{ surah: "asc" }, { ayah: "asc" }],
      select: { surah: true, ayah: true }
    }),
    prisma.tafsirNote.findMany({
      where: { learnerId },
      select: { verse: { select: { surah: true, ayahNumber: true } }, category: true, content: true }
    })
  ]);
  const noteMap = new Map<string, typeof notes>();
  for (const note of notes) {
    const key = `${note.verse.surah}:${note.verse.ayahNumber}`;
    noteMap.set(key, [...(noteMap.get(key) ?? []), note]);
  }
  return occurrences.map((occurrence) => {
    const verseNotes = noteMap.get(`${occurrence.surah}:${occurrence.ayah}`) ?? [];
    const info = verseNotes.find((note) => note.category === "ayat_information");
    const summary = verseNotes.find((note) => note.category === "tafsir_summary");
    return {
      surah: occurrence.surah,
      ayah: occurrence.ayah,
      surahName: surahName(occurrence.surah),
      theme: text(objectValue(info?.content ?? {}).theme),
      summary: text(objectValue(summary?.content ?? {}).indonesian),
      completedSections: verseNotes.filter((note) => hasMeaningfulNoteContent(note.content)).length
    };
  });
}

export async function getRandomPreparedTafsirVerse(learnerId: string) {
  const verses = await prisma.verse.findMany({
    where: { notes: { some: { learnerId, category: "competition_note" } } },
    select: { surah: true, ayahNumber: true },
    orderBy: [{ surah: "asc" }, { ayahNumber: "asc" }]
  });
  if (!verses.length) return null;
  return verses[Math.floor(Math.random() * verses.length)];
}
