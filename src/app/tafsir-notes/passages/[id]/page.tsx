import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpenText } from "lucide-react";
import TafsirNotesWorkspace from "@/components/TafsirNotesWorkspace";
import { getLearnerId } from "@/lib/session";
import { getRandomPreparedTafsirPassage, getTafsirPassage } from "@/lib/tafsir-notes";

export const dynamic = "force-dynamic";

export default async function TafsirPassagePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ mode?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const learnerId = await getLearnerId();
  const [passage, random] = await Promise.all([getTafsirPassage(id, learnerId), getRandomPreparedTafsirPassage(learnerId)]);
  if (!passage) notFound();
  const first = passage.verses[0];
  const randomHref = random ? `/tafsir-notes/passages/${random.id}?mode=competition` : `/tafsir-notes/passages/${id}?mode=competition`;
  return <main className="shell notes-shell">
    <div className="notes-breadcrumb"><Link href="/tafsir-notes"><ArrowLeft size={17} /> Tafsir Notes</Link><span><BookOpenText size={15} /> {passage.range}</span></div>
    <TafsirNotesWorkspace surah={first.surah} ayah={first.ayah} surahName={passage.range} arabicText={first.arabicText} title={passage.title} passageVerses={passage.verses} initialDocument={passage.document} hasSavedNotes={passage.hasSavedNotes} initialMode={query.mode === "competition" ? "competition" : "reading"} randomHref={randomHref} randomLabel="Random passage" saveUrl={`/api/tafsir-passages/${id}`} deleteUrl={`/api/tafsir-passages/${id}`} />
  </main>;
}
