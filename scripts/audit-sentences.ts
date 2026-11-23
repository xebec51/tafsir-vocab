import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
async function main() {
  if (decodeURIComponent(new URL(process.env.DATABASE_URL ?? "").pathname.slice(1)) !== "tafsir_vocab") throw new Error("Wrong database.");
  const [segments, migrations, oldData] = await Promise.all([
    db.sentenceSegment.findMany({ include: { page: true, verse: true, words: { include: { occurrence: { select: { pageId: true, verseKey: true } } } } } }),
    db.$queryRaw<Array<{ migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }>>`SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY started_at`,
    Promise.all([db.user.count(), db.wordProgress.count(), db.attempt.count(), db.tafsirNote.count(), db.tafsirPassage.count()])
  ]);
  const invalid = segments.filter((segment) => segment.page.juzId !== 14 || segment.page.mushafPage < 262 || segment.page.mushafPage > 281 || !segment.verse.arabicText.includes(segment.arabicText) || (segment.curationStatus === "READY" && (!segment.englishTranslation || !segment.translationSource || !segment.sourceUrl || !segment.words.length)) || segment.words.some(({ occurrence }) => occurrence.pageId !== segment.pageId));
  console.log({ pages: new Set(segments.map((segment) => segment.page.mushafPage)).size, segments: segments.length, ready: segments.filter((segment) => segment.curationStatus === "READY").length, pending: segments.filter((segment) => segment.curationStatus === "PENDING").length, invalid: invalid.length, migrationRecorded: migrations.some((migration) => migration.migration_name === "20261123090000_sentence_translation" && migration.finished_at && !migration.rolled_back_at), existingData: { users: oldData[0], wordProgress: oldData[1], attempts: oldData[2], notes: oldData[3], passages: oldData[4] } });
  if (invalid.length) throw new Error("Sentence validation failed.");
}
main().catch(() => { console.error("Sentence audit failed."); process.exitCode = 1; }).finally(() => db.$disconnect());
