import { PrismaClient } from "@prisma/client";
import { getVersesByPage } from "../src/lib/quran-api";
import { wordAudioUrl } from "../src/lib/audio";
const db = new PrismaClient();
async function main() {
  if (decodeURIComponent(new URL(process.env.DATABASE_URL ?? "").pathname.slice(1)) !== "tafsir_vocab") throw new Error("Use the dedicated TafsirVocab database.");
  let verified = 0;
  for (let page = 262; page <= 281; page++) {
    const [verses, segments] = await Promise.all([
      getVersesByPage(page, "en", { audio: 7 }),
      db.sentenceSegment.findMany({ where: { page: { juzId: 14, mushafPage: page }, curationStatus: "READY" }, include: { verse: true } })
    ]);
    const checked = await Promise.all(segments.map(async (segment) => {
      const key = `${segment.verse.surah}:${segment.verse.ayahNumber}`;
      const verse = verses.find((item) => item.verse_key === key);
      const url = wordAudioUrl(verse?.audio?.url);
      // Only whole ayat: never approximate timings or use another verse's clip.
      if (!verse || verse.text_uthmani !== segment.arabicText || segment.arabicText !== segment.verse.arabicText || !url) return null;
      const parsed = new URL(url);
      const filename = `${String(segment.verse.surah).padStart(3, "0")}${String(segment.verse.ayahNumber).padStart(3, "0")}.mp3`;
      if (parsed.protocol !== "https:" || parsed.hostname !== "audio.qurancdn.com" || !parsed.pathname.endsWith(`/${filename}`)) return null;
      try {
        const response = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(15000) });
        return response.ok && /audio|octet-stream/.test(response.headers.get("content-type") ?? "") ? { id: segment.id, url } : null;
      } catch { return null; }
    }));
    const rows = checked.filter((row): row is { id: string; url: string } => Boolean(row));
    if (rows.length) await db.$executeRaw`
      UPDATE "SentenceSegment" AS segment SET "audioUrl" = checked.url, "audioVerified" = true
      FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS checked(id text, url text)
      WHERE segment.id = checked.id
    `;
    verified += rows.length;
    console.log(`Page ${page}: ${rows.length}/${segments.length} full-ayah audio references verified.`);
  }
  console.log({ verified, pending: await db.sentenceSegment.count({ where: { curationStatus: "READY", audioVerified: false } }) });
}
main().catch(() => { console.error("Audio verification failed; unverified clips remain disabled."); process.exitCode = 1; }).finally(() => db.$disconnect());
