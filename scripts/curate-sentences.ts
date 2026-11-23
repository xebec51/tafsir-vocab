import { readFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const db = new PrismaClient();
const Row = z.object({
  id: z.string().optional(), page: z.number().int().min(262).max(281), surah: z.number().int().min(15).max(16), ayah: z.number().int().positive(),
  segmentOrder: z.number().int().positive(), verseOrder: z.number().int().positive(),
  startWordPosition: z.number().int().positive().optional(), endWordPosition: z.number().int().positive().optional(),
  arabicText: z.string().min(1), englishTranslation: z.string().min(1).optional(), indonesianTranslation: z.string().optional(),
  translationSource: z.string().min(1).optional(), sourceUrl: z.url().refine((url) => url.startsWith("https://")).optional(),
  contextNote: z.string().optional(), explanation: z.string().optional(), acceptedAnswers: z.array(z.string().min(1)).max(30).default([]),
  audioUrl: z.url().refine((url) => url.startsWith("https://")).optional(), audioVerified: z.boolean().default(false),
  curationStatus: z.enum(["PENDING", "READY", "ARCHIVED"]).default("PENDING")
}).strict();

async function main() {
  if (decodeURIComponent(new URL(process.env.DATABASE_URL ?? "").pathname.slice(1)) !== "tafsir_vocab") throw new Error("Use the dedicated TafsirVocab database.");
  const filename = process.argv[2];
  if (!filename) throw new Error("Usage: npm run data:curate:sentences -- path/to/curation.json");
  const rows = z.array(Row).min(1).max(300).parse(JSON.parse(await readFile(filename, "utf8")));
  await db.$transaction(async (tx) => {
    for (const row of rows) {
      const page = await tx.page.findUniqueOrThrow({ where: { juzId_mushafPage: { juzId: 14, mushafPage: row.page } } });
      const verse = await tx.verse.findUniqueOrThrow({ where: { surah_ayahNumber: { surah: row.surah, ayahNumber: row.ayah } } });
      if (!verse.arabicText.includes(row.arabicText)) throw new Error("Arabic must be an exact, unmodified substring of the stored ayah.");
      if (row.curationStatus === "READY" && (!row.englishTranslation || !row.translationSource || !row.sourceUrl)) throw new Error("Ready segments require a sourced translation.");
      if (row.audioVerified && !row.audioUrl) throw new Error("Verified audio requires an audited URL.");
      if (row.arabicText !== verse.arabicText && (!row.startWordPosition || !row.endWordPosition)) throw new Error("Partial ayat require exact word boundaries.");
      if ((row.startWordPosition ?? 0) > (row.endWordPosition ?? Number.MAX_SAFE_INTEGER)) throw new Error("Word range is invalid.");
      const words = await tx.wordOccurrence.findMany({ where: { pageId: page.id, surah: row.surah, ayah: row.ayah, wordPosition: { gte: row.startWordPosition, lte: row.endWordPosition } }, orderBy: { wordPosition: "asc" } });
      if (!words.length || words.some((word) => !row.arabicText.includes(word.arabic))) throw new Error("Segment words must match the stored Arabic and selected page.");
      const existing = row.id ? await tx.sentenceSegment.findUniqueOrThrow({ where: { id: row.id }, include: { _count: { select: { attempts: true } } } }) : null;
      if (existing && (existing.pageId !== page.id || existing.verseId !== verse.id)) throw new Error("A segment cannot be moved to another page or ayah.");
      if (existing?._count.attempts && (existing.arabicText !== row.arabicText || existing.englishTranslation !== (row.englishTranslation ?? null))) throw new Error("Practiced content is immutable: archive it and add a new segment to preserve history.");
      const { page: _page, surah: _surah, ayah: _ayah, id: _id, ...content } = row;
      const data = { ...content, pageId: page.id, verseId: verse.id };
      if (existing) await tx.sentenceSegment.update({ where: { id: existing.id }, data: { ...data, words: { deleteMany: {}, create: words.map((word) => ({ occurrenceId: word.id })) } } });
      else await tx.sentenceSegment.create({ data: { ...data, words: { create: words.map((word) => ({ occurrenceId: word.id })) } } });
    }
  }, { timeout: 60000 });
  console.log(`Validated and saved ${rows.length} curated segments.`);
}
main().catch((error) => { console.error(error instanceof Error && !('code' in error) ? error.message : "Curation failed; no changes were committed."); process.exitCode = 1; }).finally(() => db.$disconnect());
