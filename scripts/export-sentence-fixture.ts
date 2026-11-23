import { writeFile, mkdir } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main() {
  const segments = await db.sentenceSegment.findMany({ where: { curationStatus: "READY", page: { mushafPage: 262, juzId: 14 } }, include: { verse: true }, orderBy: { segmentOrder: "asc" }, take: 4 });
  if (segments.length !== 4) throw new Error("Import sourced page material first.");
  const fixture = segments.map((segment) => ({ surah: segment.verse.surah, ayahNumber: segment.verse.ayahNumber, arabic: segment.arabicText, english: segment.englishTranslation, source: segment.translationSource, url: segment.sourceUrl, audioUrl: segment.audioVerified ? segment.audioUrl : null }));
  await mkdir("tests/fixtures", { recursive: true });
  await writeFile("tests/fixtures/sentence-source.json", JSON.stringify(fixture, null, 2) + "\n");
  console.log("Exported four sourced ayat for repeatable database tests.");
}
main().catch(() => { console.error("Fixture export failed."); process.exitCode = 1; }).finally(() => db.$disconnect());
