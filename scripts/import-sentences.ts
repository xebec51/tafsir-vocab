import { PrismaClient } from "@prisma/client";
import { getTranslationResources, getVersesByPage } from "../src/lib/quran-api";
import { parseFragment, type DefaultTreeAdapterMap } from "parse5";

function translationText(html: string | undefined): string | null {
  if (!html) return null;
  function read(node: DefaultTreeAdapterMap["node"]): string {
    if ("tagName" in node && node.tagName === "sup") return "";
    if ("value" in node) return node.value;
    return "childNodes" in node ? node.childNodes.map(read).join("") : "";
  }
  return read(parseFragment(html)).replace(/\s+/g, " ").trim() || null;
}

const db = new PrismaClient();
async function main() {
  const database = new URL(process.env.DATABASE_URL ?? "");
  if (decodeURIComponent(database.pathname.slice(1)) !== "tafsir_vocab") throw new Error("Sentence imports require the dedicated tafsir_vocab database.");
  const resources = await getTranslationResources();
  const english = resources.find((resource) => resource.id === 20 && resource.language_name.toLowerCase() === "english");
  const indonesian = resources.find((resource) => resource.language_name.toLowerCase() === "indonesian");
  if (!english) throw new Error("Verified English translation resource 20 is unavailable.");
  for (let pageNumber = 262; pageNumber <= 281; pageNumber++) {
    const page = await db.page.findUniqueOrThrow({ where: { juzId_mushafPage: { juzId: 14, mushafPage: pageNumber } } });
    const verses = await getVersesByPage(pageNumber, "en", { translations: [english.id, ...(indonesian ? [indonesian.id] : [])], audio: 7 });
    const pageWords = await db.wordOccurrence.findMany({ where: { pageId: page.id }, orderBy: { wordPosition: "asc" } });
    const prepared = verses.map((source, index) => {
      const [surah, ayahNumber] = source.verse_key.split(":").map(Number);
      const occurrences = pageWords.filter((word) => word.surah === surah && word.ayah === ayahNumber);
      const arabic = occurrences[0]?.contextArabic;
      if (!arabic || arabic !== source.text_uthmani) throw new Error(`Stored Arabic and source disagree at ${source.verse_key}; import Juz 14 first.`);
      const translation = translationText(source.translations?.find((item) => item.resource_id === english.id)?.text);
      const translationId = indonesian ? translationText(source.translations?.find((item) => item.resource_id === indonesian.id)?.text) : null;
      return { source, surah, ayahNumber, arabic, occurrences, translation, translationId, position: index + 1 };
    });
    await db.$transaction(async (tx) => {
      await tx.verse.createMany({ data: prepared.map((item) => ({ surah: item.surah, ayahNumber: item.ayahNumber, arabicText: item.arabic })), skipDuplicates: true });
      const stored = await tx.verse.findMany({ where: { OR: prepared.map((item) => ({ surah: item.surah, ayahNumber: item.ayahNumber })) }, select: { id: true, surah: true, ayahNumber: true } });
      const verseIds = new Map(stored.map((item) => [`${item.surah}:${item.ayahNumber}`, item.id]));
      // Whole ayat retain their meaning; narrower semantic boundaries require explicit curation.
      await tx.sentenceSegment.createMany({ skipDuplicates: true, data: prepared.map((item) => ({
          id: `qf14_${pageNumber}_${item.surah}_${item.ayahNumber}`, pageId: page.id, verseId: verseIds.get(item.source.verse_key)!, segmentOrder: item.position, arabicText: item.arabic,
          englishTranslation: item.translation, indonesianTranslation: item.translationId,
          translationSource: `${english.name} / ${english.author_name} (Quran Foundation resource ${english.id})${indonesian ? `; Indonesian: ${indonesian.name}, resource ${indonesian.id}` : ""}`,
          sourceUrl: `https://quran.com/${item.surah}/${item.ayahNumber}?translations=${english.id}`,
          curationStatus: item.translation ? "READY" : "PENDING",
          // An API URL alone does not verify alignment; listening remains pending until audited.
          audioUrl: item.source.audio?.url ?? null, audioVerified: false
      })) });
      const segments = await tx.sentenceSegment.findMany({ where: { pageId: page.id, verseOrder: 1 }, select: { id: true, verseId: true } });
      const segmentIds = new Map(segments.map((segment) => [segment.verseId, segment.id]));
      await tx.sentenceSegmentWord.createMany({ skipDuplicates: true, data: prepared.flatMap((item) => item.occurrences.map((word) => ({ segmentId: segmentIds.get(verseIds.get(item.source.verse_key)!)!, occurrenceId: word.id }))) });
    }, { timeout: 30000 });
    console.log(`Page ${pageNumber}: ${prepared.length} whole-ayah sentence groups checked.`);
  }
  console.log({ ready: await db.sentenceSegment.count({ where: { curationStatus: "READY" } }), pending: await db.sentenceSegment.count({ where: { curationStatus: "PENDING" } }) });
}
main().catch((error) => { console.error("Sentence import failed:", error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[database URL redacted]").replace(/(password|secret|token)[=: ]+\S+/gi, "$1 [redacted]") : "Unknown error"); process.exitCode = 1; }).finally(() => db.$disconnect());
