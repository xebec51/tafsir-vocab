import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { normalizeArabic } from "../src/lib/arabic";

const prisma = new PrismaClient();

type Entry = {
  lemma: string;
  root?: string;
  englishPrimary: string;
  englishAlternatives?: string[];
  indonesian?: string;
  courseStatus?: "CORE" | "SUPPORT";
  reviewStatus?: "REVIEWED" | "FINAL";
};

async function main() {
  const filename = process.argv[2] ?? "data/juz14/curation.json";
  const file = path.resolve(filename);
  if (!fs.existsSync(file)) throw new Error(`Curation file not found: ${file}`);
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  const entries: Entry[] = Array.isArray(parsed) ? parsed : parsed.entries;
  if (!Array.isArray(entries)) throw new Error("Expected an array or { entries: [] }.");

  let updated = 0;
  for (const entry of entries) {
    const normalized = normalizeArabic(entry.lemma);
    const candidates = await prisma.lexeme.findMany({
      where: { OR: [{ key: `lemma:${normalized}` }, { lemma: entry.lemma }, { arabicDisplay: entry.lemma }] }
    });
    for (const lexeme of candidates) {
      await prisma.lexeme.update({
        where: { id: lexeme.id },
        data: {
          lemma: entry.lemma,
          root: entry.root,
          englishPrimary: entry.englishPrimary,
          englishAlternatives: JSON.stringify([...new Set([entry.englishPrimary, ...(entry.englishAlternatives ?? [])])]),
          indonesian: entry.indonesian,
          courseStatus: entry.courseStatus ?? lexeme.courseStatus,
          reviewStatus: entry.reviewStatus ?? "REVIEWED"
        }
      });
      updated++;
    }
  }
  console.log(`Applied curation to ${updated} lexeme records.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
