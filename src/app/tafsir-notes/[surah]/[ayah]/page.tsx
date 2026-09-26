import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import TafsirNotesWorkspace from "@/components/TafsirNotesWorkspace";
import { getLearnerId } from "@/lib/session";
import { getRandomPreparedTafsirVerse, getTafsirVerse } from "@/lib/tafsir-notes";

export const dynamic = "force-dynamic";

function randomJuz14Verse() {
  const value = Math.floor(Math.random() * 227);
  return value < 99 ? { surah: 15, ayah: value + 1 } : { surah: 16, ayah: value - 98 };
}

export default async function TafsirNoteVersePage({ params, searchParams }: { params: Promise<{ surah: string; ayah: string }>; searchParams: Promise<{ mode?: string }> }) {
  const route = await params;
  const query = await searchParams;
  const surah = Number(route.surah);
  const ayah = Number(route.ayah);
  if (!Number.isInteger(surah) || !Number.isInteger(ayah)) notFound();
  const learnerId = await getLearnerId();
  const [verse, preparedRandom] = await Promise.all([
    getTafsirVerse(surah, ayah, learnerId),
    getRandomPreparedTafsirVerse(learnerId)
  ]);
  if (!verse) notFound();
  const random = preparedRandom ? { surah: preparedRandom.surah, ayah: preparedRandom.ayahNumber } : randomJuz14Verse();
  return <main className="shell notes-shell">
    <div className="notes-breadcrumb"><Link href="/tafsir-notes"><ArrowLeft size={17} /> Tafsir Notes</Link><span><FileText size={15} /> Juz 14</span></div>
    <TafsirNotesWorkspace {...verse} initialDocument={verse.document} initialMode={query.mode === "competition" ? "competition" : "reading"} randomHref={`/tafsir-notes/${random.surah}/${random.ayah}?mode=competition`} />
  </main>;
}
