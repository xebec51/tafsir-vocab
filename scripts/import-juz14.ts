import { PrismaClient } from "@prisma/client";
import { cleanGloss, courseStatusFor, normalizeArabic } from "../src/lib/arabic";
import { getVersesByPage, QuranVerse, QuranWord } from "../src/lib/quran-api";

const prisma = new PrismaClient();

const SURAH_NAMES: Record<number, string> = {
  15: "Al-Hijr",
  16: "An-Nahl"
};

type FlatWord = {
  word: QuranWord;
  verse: QuranVerse;
  surah: number;
  ayah: number;
  location: string;
};

function parseVerseKey(verseKey: string) {
  const [surah, ayah] = verseKey.split(":").map(Number);
  return { surah, ayah };
}

function flatten(verses: QuranVerse[]): FlatWord[] {
  return verses.flatMap((verse) => {
    const { surah, ayah } = parseVerseKey(verse.verse_key);

    return (verse.words ?? [])
      .filter((word) => {
        if (word.char_type_name) return word.char_type_name === "word";
        const uthmani = word.text_uthmani ?? "";
        return !/^[٠-٩۰-۹]+$/.test(uthmani.trim());
      })
      .map((word) => ({
        word,
        verse,
        surah,
        ayah,
        location:
          word.location ??
          `${verse.verse_key}:${word.position}`
      }));
  });
}

function pageMetadata(verses: QuranVerse[]) {
  const groups = new Map<number, number[]>();

  for (const verse of verses) {
    const { surah, ayah } = parseVerseKey(verse.verse_key);
    groups.set(surah, [...(groups.get(surah) ?? []), ayah]);
  }

  const surahs = [...groups.keys()];
  const surahLabel = surahs
    .map((surah) => SURAH_NAMES[surah] ?? `Surah ${surah}`)
    .join(" / ");

  const verseRange = [...groups.entries()]
    .map(([surah, ayahs]) => {
      const first = Math.min(...ayahs);
      const last = Math.max(...ayahs);
      return first === last
        ? `${surah}:${first}`
        : `${surah}:${first}–${last}`;
    })
    .join(" · ");

  return { surahLabel, verseRange };
}

async function importPage(unitNumber: number, mushafPage: number) {
  console.log(`Importing unit ${unitNumber}/20 — Mushaf page ${mushafPage}...`);

  const [englishVerses, indonesianVerses] = await Promise.all([
    getVersesByPage(mushafPage, "en"),
    getVersesByPage(mushafPage, "id")
  ]);

  if (!englishVerses.length) {
    throw new Error(`No verses returned for Mushaf page ${mushafPage}.`);
  }

  const englishWords = flatten(englishVerses);
  const indonesianByLocation = new Map(
    flatten(indonesianVerses).map(({ word, location }) => [
      location,
      cleanGloss(word.translation?.text)
    ])
  );

  const page = await prisma.page.findUniqueOrThrow({
    where: {
      juzId_unitNumber: {
        juzId: 14,
        unitNumber
      }
    }
  });

  const { surahLabel, verseRange } = pageMetadata(englishVerses);
  const coreLexemeIds = new Set<number>();

  for (const entry of englishWords) {
    const {
      word,
      verse,
      surah,
      ayah,
      location
    } = entry;

    const arabic =
      word.text_uthmani ??
      word.text_imlaei ??
      "";

    if (!arabic) continue;

    const normalizedArabic = normalizeArabic(arabic);
    if (!normalizedArabic) continue;

    const english = cleanGloss(word.translation?.text);
    const indonesian = indonesianByLocation.get(location) ?? null;
    const courseStatus = courseStatusFor(arabic, english);

    // This is intentionally provisional. Morphology enrichment later merges
    // surface forms into canonical lemma-level Lexeme records.
    const lexemeKey = `surface:${normalizedArabic}`;

    const lexeme = await prisma.lexeme.upsert({
      where: { key: lexemeKey },
      update: {
        arabicDisplay: arabic,
        englishPrimary: english ?? undefined,
        indonesian: indonesian ?? undefined,
        courseStatus:
          courseStatus === "CORE" ? "CORE" : undefined
      },
      create: {
        key: lexemeKey,
        arabicDisplay: arabic,
        englishPrimary: english,
        englishAlternatives: JSON.stringify(
          english ? [english] : []
        ),
        indonesian,
        courseStatus,
        reviewStatus: "PROVISIONAL"
      }
    });

    if (lexeme.courseStatus === "CORE" || courseStatus === "CORE") {
      coreLexemeIds.add(lexeme.id);
    }

    await prisma.wordOccurrence.upsert({
      where: { location },
      update: {
        pageId: page.id,
        lexemeId: lexeme.id,
        arabic,
        uthmani: word.text_uthmani ?? null,
        normalizedArabic,
        transliteration: word.transliteration?.text ?? null,
        sourceEnglish: english,
        sourceIndonesian: indonesian,
        contextArabic: verse.text_uthmani ?? null,
        wordPosition: word.position,
        verseKey: verse.verse_key,
        surah,
        ayah
      },
      create: {
        pageId: page.id,
        lexemeId: lexeme.id,
        location,
        verseKey: verse.verse_key,
        surah,
        ayah,
        wordPosition: word.position,
        arabic,
        uthmani: word.text_uthmani ?? null,
        normalizedArabic,
        transliteration: word.transliteration?.text ?? null,
        sourceEnglish: english,
        sourceIndonesian: indonesian,
        contextArabic: verse.text_uthmani ?? null
      }
    });
  }

  await prisma.page.update({
    where: { id: page.id },
    data: {
      surahLabel,
      verseRange,
      wordCount: englishWords.length,
      coreWordCount: coreLexemeIds.size
    }
  });

  console.log(
    `  ${verseRange} | ${englishWords.length} word occurrences | ${coreLexemeIds.size} provisional core lexemes`
  );
}

async function main() {
  const juz = await prisma.juz.findUnique({ where: { number: 14 } });
  if (!juz) {
    throw new Error("Run `npm run db:seed` before importing Juz 14.");
  }

  for (let unit = 1; unit <= 20; unit++) {
    await importPage(unit, 261 + unit);
  }

  const [pages, occurrences, lexemes, core] = await Promise.all([
    prisma.page.count({ where: { juzId: 14 } }),
    prisma.wordOccurrence.count({ where: { page: { juzId: 14 } } }),
    prisma.lexeme.count({
      where: { occurrences: { some: { page: { juzId: 14 } } } }
    }),
    prisma.lexeme.count({
      where: {
        courseStatus: "CORE",
        occurrences: { some: { page: { juzId: 14 } } }
      }
    })
  ]);

  console.log("\nJuz 14 import complete.");
  console.log({ pages, occurrences, provisionalLexemes: lexemes, coreCandidates: core });
  console.log(
    "\nNext: enrich lemma/root/POS with `npm run data:enrich:morphology -- path/to/quranic-corpus-morphology-0.4.txt`"
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
