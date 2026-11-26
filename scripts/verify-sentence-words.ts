import { PrismaClient } from "@prisma/client";
import { getVersesByPage } from "../src/lib/quran-api";
import { alignedWordAudio } from "../src/lib/audio";
const db = new PrismaClient();
async function main() {
  if (new URL(process.env.DATABASE_URL ?? "").pathname !== "/tafsir_vocab") throw new Error("Use the dedicated TafsirVocab database.");
  let verified = 0;
  const repairs: Array<{ location: string; arabic: string; audio: string }> = [];
  for (let page = 262; page <= 281; page++) {
    const [verses, words] = await Promise.all([
      getVersesByPage(page, "en"),
      db.wordOccurrence.findMany({ where: { page: { juzId: 14, mushafPage: page } }, select: { location: true, arabic: true, audioUrl: true } })
    ]);
    const sources = new Map(verses.flatMap((verse) => (verse.words ?? []).map((word) => [word.location ?? `${verse.verse_key}:${word.position}`, word] as const)));
    for (const word of words) {
      const source = sources.get(word.location);
      if (!source || source.text_uthmani !== word.arabic || !source.audio_url || !alignedWordAudio(source.audio_url, word.location)) throw new Error(`Source text or audio position mismatch at ${word.location}. No repairs applied.`);
      if (source.audio_url !== word.audioUrl) repairs.push({ location: word.location, arabic: word.arabic, audio: source.audio_url });
      verified++;
    }
    console.log(`Page ${page}: ${words.length} word texts, locations and source audio references verified.`);
  }
  if (repairs.length && process.argv.includes("--apply")) {
    const updated = await db.$executeRaw`
      UPDATE "WordOccurrence" AS word SET "audioUrl" = source.audio
      FROM jsonb_to_recordset(${JSON.stringify(repairs)}::jsonb) AS source(location text, arabic text, audio text)
      WHERE word.location = source.location AND word.arabic = source.arabic
    `;
    if (updated !== repairs.length) throw new Error("Concurrent material changes detected; audit again.");
    console.log({ verifiedWords: verified, repairedAudioReferences: updated });
  } else {
    console.log({ verifiedWords: verified, audioReferencesNeedingRepair: repairs.length });
    if (repairs.length) process.exitCode = 1;
  }
}
main().catch((error) => { console.error(error instanceof Error && !('code' in error) ? error.message.replace(/https?:\/\/\S+/g, "[URL]") : "Word audio verification failed."); process.exitCode = 1; }).finally(() => db.$disconnect());
