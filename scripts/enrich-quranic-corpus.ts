import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { normalizeArabic } from "../src/lib/arabic";

const prisma = new PrismaClient();

const BW: Record<string, string> = {
  "'": "ء", "|": "آ", ">": "أ", "&": "ؤ", "<": "إ", "}": "ئ",
  "A": "ا", "b": "ب", "p": "ة", "t": "ت", "v": "ث", "j": "ج",
  "H": "ح", "x": "خ", "d": "د", "*": "ذ", "r": "ر", "z": "ز",
  "s": "س", "$": "ش", "S": "ص", "D": "ض", "T": "ط", "Z": "ظ",
  "E": "ع", "g": "غ", "f": "ف", "q": "ق", "k": "ك", "l": "ل",
  "m": "م", "n": "ن", "h": "ه", "w": "و", "Y": "ى", "y": "ي",
  "F": "ً", "N": "ٌ", "K": "ٍ", "a": "َ", "u": "ُ", "i": "ِ",
  "~": "ّ", "o": "ْ", "`": "ٰ", "{": "ٱ"
};

function buckwalterToArabic(value?: string | null) {
  if (!value) return null;
  return [...value].map((char) => BW[char] ?? char).join("");
}

type Morph = {
  lemmaCorpus?: string;
  rootCorpus?: string;
  pos?: string;
};

function parseMorphology(text: string) {
  const map = new Map<string, Morph>();

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith("LOCATION")) continue;

    const parts = line.split("\t");
    if (parts.length < 4) continue;

    const location = parts[0];
    const tag = parts[2];
    const features = parts[3];

    // Quranic Arabic Corpus segment location:
    // (chapter:verse:word:segment)
    const match = location.match(/^\((\d+):(\d+):(\d+):(\d+)\)$/);
    if (!match) continue;

    const [, surah, ayah, word] = match;
    const key = `${surah}:${ayah}:${word}`;

    const lemma = features.match(/(?:^|\|)LEM:([^|]+)/)?.[1];
    const root = features.match(/(?:^|\|)ROOT:([^|]+)/)?.[1];

    const existing = map.get(key) ?? {};
    map.set(key, {
      lemmaCorpus: existing.lemmaCorpus ?? lemma,
      rootCorpus: existing.rootCorpus ?? root,
      pos: existing.pos ?? tag
    });
  }

  return map;
}

async function main() {
  const inputArg = process.argv[2];

  if (!inputArg) {
    throw new Error(
      "Pass the Quranic Arabic Corpus morphology file path.\n" +
      "Example: npm run data:enrich:morphology -- data/import/quranic-corpus-morphology-0.4.txt"
    );
  }

  const filePath = path.resolve(inputArg);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Morphology file not found: ${filePath}`);
  }

  const morphology = parseMorphology(fs.readFileSync(filePath, "utf8"));
  const occurrences = await prisma.wordOccurrence.findMany({
    where: { page: { juzId: 14 } },
    include: { lexeme: true },
    orderBy: [{ surah: "asc" }, { ayah: "asc" }, { wordPosition: "asc" }]
  });

  let matched = 0;
  let merged = 0;

  for (const occurrence of occurrences) {
    const morph = morphology.get(
      `${occurrence.surah}:${occurrence.ayah}:${occurrence.wordPosition}`
    );

    if (!morph) continue;
    matched++;

    const lemmaArabic = buckwalterToArabic(morph.lemmaCorpus);
    const rootArabic = buckwalterToArabic(morph.rootCorpus);

    // Canonical lemma key. If the corpus does not expose a lemma for a segment,
    // retain the provisional surface lexeme.
    const canonicalNormalized = lemmaArabic
      ? normalizeArabic(lemmaArabic)
      : "";

    if (!canonicalNormalized) {
      await prisma.lexeme.update({
        where: { id: occurrence.lexemeId },
        data: {
          root: rootArabic,
          rootCorpus: morph.rootCorpus,
          partOfSpeech: morph.pos
        }
      });
      continue;
    }

    const canonicalKey = `lemma:${canonicalNormalized}`;
    const source = occurrence.lexeme;

    const target = await prisma.lexeme.upsert({
      where: { key: canonicalKey },
      update: {
        lemma: lemmaArabic,
        lemmaCorpus: morph.lemmaCorpus,
        root: rootArabic ?? undefined,
        rootCorpus: morph.rootCorpus ?? undefined,
        partOfSpeech: morph.pos ?? undefined,
        englishPrimary: source.englishPrimary ?? undefined,
        indonesian: source.indonesian ?? undefined,
        courseStatus:
          source.courseStatus === "CORE" ? "CORE" : undefined
      },
      create: {
        key: canonicalKey,
        arabicDisplay: lemmaArabic,
        lemma: lemmaArabic,
        lemmaCorpus: morph.lemmaCorpus,
        root: rootArabic,
        rootCorpus: morph.rootCorpus,
        partOfSpeech: morph.pos,
        englishPrimary: source.englishPrimary,
        englishAlternatives: source.englishAlternatives,
        indonesian: source.indonesian,
        courseStatus: source.courseStatus,
        reviewStatus: "PROVISIONAL",
        difficulty: source.difficulty
      }
    });

    if (target.id !== occurrence.lexemeId) {
      await prisma.wordOccurrence.update({
        where: { id: occurrence.id },
        data: { lexemeId: target.id }
      });
      merged++;
    }
  }

  console.log({
    occurrences: occurrences.length,
    morphologyMatches: matched,
    reassignedToCanonicalLemma: merged
  });

  console.log(
    "Morphology enrichment complete. Provisional surface lexemes are intentionally retained until curation is finished."
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
