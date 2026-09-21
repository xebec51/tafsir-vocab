import { prisma } from "@/lib/prisma";

export type CourseWord = {
  lexemeId: number;
  occurrenceId: number;
  location: string;
  verseKey: string;
  arabic: string;
  lemma: string | null;
  root: string | null;
  partOfSpeech: string | null;
  transliteration: string | null;
  english: string;
  alternatives: string[];
  indonesian: string | null;
  contextArabic: string | null;
  audioUrl: string | null;
  courseStatus: string;
  masteryLevel: string;
};

function parseAlternatives(raw: string, primary: string | null) {
  try {
    const parsed = JSON.parse(raw) as unknown;
    const list = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
    return [...new Set([...(primary ? [primary] : []), ...list])];
  } catch {
    return primary ? [primary] : [];
  }
}

export async function getUnitCourse(unitNumber: number, learnerId: string) {
  const page = await prisma.page.findUnique({
    where: { juzId_unitNumber: { juzId: 14, unitNumber } },
    select: {
      id: true,
      unitNumber: true,
      mushafPage: true,
      label: true,
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
      },
      occurrences: {
        select: {
          id: true,
          location: true,
          verseKey: true,
          surah: true,
          ayah: true,
          wordPosition: true,
          arabic: true,
          transliteration: true,
          sourceIndonesian: true,
          contextArabic: true,
          audioUrl: true,
          lexeme: {
            select: {
              id: true,
              lemma: true,
              root: true,
              partOfSpeech: true,
              englishPrimary: true,
              englishAlternatives: true,
              indonesian: true,
              courseStatus: true,
              progresses: { where: { learnerId }, take: 1, select: { masteryLevel: true } }
            }
          }
        },
        orderBy: [{ surah: "asc" }, { ayah: "asc" }, { wordPosition: "asc" }]
      }
    }
  });

  if (!page) return null;

  const { occurrences, ...pageData } = page;
  const seen = new Set<number>();
  const words: CourseWord[] = [];
  for (const occurrence of occurrences) {
    const lexeme = occurrence.lexeme;
    if (seen.has(lexeme.id) || !lexeme.englishPrimary) continue;
    seen.add(lexeme.id);
    words.push({
      lexemeId: lexeme.id,
      occurrenceId: occurrence.id,
      location: occurrence.location,
      verseKey: occurrence.verseKey,
      arabic: occurrence.arabic,
      lemma: lexeme.lemma,
      root: lexeme.root,
      partOfSpeech: lexeme.partOfSpeech,
      transliteration: occurrence.transliteration,
      english: lexeme.englishPrimary,
      alternatives: parseAlternatives(lexeme.englishAlternatives, lexeme.englishPrimary),
      indonesian: lexeme.indonesian ?? occurrence.sourceIndonesian,
      contextArabic: occurrence.contextArabic,
      audioUrl: occurrence.audioUrl,
      courseStatus: lexeme.courseStatus,
      masteryLevel: lexeme.progresses[0]?.masteryLevel ?? "NEW"
    });
  }

  const core = words.filter((word) => word.courseStatus === "CORE");
  return { page: pageData, words: core.length >= 4 ? core : words };
}

export async function getUnitOverview(unitNumber: number, learnerId: string) {
  const page = await prisma.page.findUnique({
    where: { juzId_unitNumber: { juzId: 14, unitNumber } },
    select: {
      id: true,
      unitNumber: true,
      mushafPage: true,
      label: true,
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
  });
  return page ? { page, words: [] as CourseWord[] } : null;
}

export function lessonSlice<T>(words: T[], lesson: number, size = 6) {
  const lessonCount = Math.max(1, Math.ceil(words.length / size));
  const safeLesson = Math.min(Math.max(1, lesson), lessonCount);
  return {
    lessonCount,
    lesson: safeLesson,
    words: words.slice((safeLesson - 1) * size, safeLesson * size)
  };
}

export async function getReviewWords(learnerId: string, limit = 20) {
  const now = new Date();
  const rows = await prisma.wordProgress.findMany({
    where: {
      learnerId,
      nextReviewAt: { lte: now },
      lexeme: { englishPrimary: { not: null } }
    },
    include: {
      lexeme: { include: { occurrences: { take: 1, orderBy: { id: "asc" } } } }
    },
    orderBy: [{ nextReviewAt: "asc" }, { wrongCount: "desc" }],
    take: limit
  });

  return rows.flatMap((row) => {
    const occurrence = row.lexeme.occurrences[0];
    if (!occurrence || !row.lexeme.englishPrimary) return [];
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
      alternatives: parseAlternatives(row.lexeme.englishAlternatives, row.lexeme.englishPrimary),
      indonesian: row.lexeme.indonesian ?? occurrence.sourceIndonesian,
      contextArabic: occurrence.contextArabic,
      audioUrl: occurrence.audioUrl,
      courseStatus: row.lexeme.courseStatus,
      masteryLevel: row.masteryLevel
    } satisfies CourseWord];
  });
}

export function maxAccessibleLesson(lessonCount: number, completedLessons: number, reviewedLessons: number, pageCompleted = false) {
  const safeCount = Math.max(1, lessonCount);
  if (pageCompleted) return safeCount;
  const completed = Math.min(safeCount, Math.max(0, completedLessons));
  const reviewed = Math.min(completed, Math.max(0, reviewedLessons));
  return Math.max(1, completed, Math.min(safeCount, reviewed + 1));
}

export async function getCourseDistractorWords(learnerId: string, limit = 80) {
  const occurrences = await prisma.wordOccurrence.findMany({
    where: {
      page: { juzId: 14 },
      lexeme: { englishPrimary: { not: null } }
    },
    include: {
      lexeme: {
        include: {
          progresses: { where: { learnerId }, take: 1 }
        }
      }
    },
    orderBy: [{ surah: "asc" }, { ayah: "asc" }, { wordPosition: "asc" }],
    take: limit * 3
  });

  const seen = new Set<number>();
  const words: CourseWord[] = [];
  for (const occurrence of occurrences) {
    const lexeme = occurrence.lexeme;
    if (seen.has(lexeme.id) || !lexeme.englishPrimary) continue;
    seen.add(lexeme.id);
    words.push({
      lexemeId: lexeme.id,
      occurrenceId: occurrence.id,
      location: occurrence.location,
      verseKey: occurrence.verseKey,
      arabic: occurrence.arabic,
      lemma: lexeme.lemma,
      root: lexeme.root,
      partOfSpeech: lexeme.partOfSpeech,
      transliteration: occurrence.transliteration,
      english: lexeme.englishPrimary,
      alternatives: parseAlternatives(lexeme.englishAlternatives, lexeme.englishPrimary),
      indonesian: lexeme.indonesian ?? occurrence.sourceIndonesian,
      contextArabic: occurrence.contextArabic,
      audioUrl: occurrence.audioUrl,
      courseStatus: lexeme.courseStatus,
      masteryLevel: lexeme.progresses[0]?.masteryLevel ?? "NEW"
    });
    if (words.length >= limit) break;
  }

  return words;
}

export async function getJuzCourseWords(learnerId: string, limit?: number) {
  const occurrences = await prisma.wordOccurrence.findMany({
    where: {
      page: { juzId: 14 },
      lexeme: { englishPrimary: { not: null } }
    },
    include: {
      lexeme: {
        include: {
          progresses: { where: { learnerId }, take: 1 }
        }
      }
    },
    orderBy: [{ surah: "asc" }, { ayah: "asc" }, { wordPosition: "asc" }]
  });

  const seen = new Set<number>();
  const words: CourseWord[] = [];
  for (const occurrence of occurrences) {
    const lexeme = occurrence.lexeme;
    if (seen.has(lexeme.id) || !lexeme.englishPrimary) continue;
    seen.add(lexeme.id);
    words.push({
      lexemeId: lexeme.id,
      occurrenceId: occurrence.id,
      location: occurrence.location,
      verseKey: occurrence.verseKey,
      arabic: occurrence.arabic,
      lemma: lexeme.lemma,
      root: lexeme.root,
      partOfSpeech: lexeme.partOfSpeech,
      transliteration: occurrence.transliteration,
      english: lexeme.englishPrimary,
      alternatives: parseAlternatives(lexeme.englishAlternatives, lexeme.englishPrimary),
      indonesian: lexeme.indonesian ?? occurrence.sourceIndonesian,
      contextArabic: occurrence.contextArabic,
      audioUrl: occurrence.audioUrl,
      courseStatus: lexeme.courseStatus,
      masteryLevel: lexeme.progresses[0]?.masteryLevel ?? "NEW"
    });
    if (limit && words.length >= limit) break;
  }

  const core = words.filter((word) => word.courseStatus === "CORE");
  return core.length >= 4 ? core : words;
}

export async function isUnitUnlocked(unitNumber: number, learnerId: string) {
  if (unitNumber <= 1) return true;
  const previous = await prisma.pageProgress.findFirst({
    where: {
      learnerId,
      completed: true,
      page: { juzId: 14, unitNumber: unitNumber - 1 }
    },
    select: { id: true }
  });
  return Boolean(previous);
}
