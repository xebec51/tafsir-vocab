import Link from "next/link";
import { BookOpenText, ChevronRight, FileText } from "lucide-react";
import CreateTafsirPassage from "@/components/CreateTafsirPassage";
import TafsirPassageLibrary from "@/components/TafsirPassageLibrary";
import { getLearnerId } from "@/lib/session";
import { getTafsirPassageIndex, getTafsirVerseIndex } from "@/lib/tafsir-notes";

export const dynamic = "force-dynamic";

export default async function TafsirNotesPage() {
  const learnerId = await getLearnerId();
  const [verses, passages] = await Promise.all([getTafsirVerseIndex(learnerId), getTafsirPassageIndex(learnerId)]);
  const prepared = verses.filter((verse) => verse.completedSections > 0);
  const surahs = [...new Set(verses.map((verse) => verse.surah))];
  return <main className="shell notes-index-shell">
    <section className="page-heading"><span className="page-heading-icon"><FileText size={23} /></span><div><div className="kicker">Musabaqah study library</div><h1>Tafsir Notes</h1><p>Build structured, verse-by-verse notes for English Tafsir preparation.</p></div></section>
    <CreateTafsirPassage verses={verses.map((verse) => ({ surah: verse.surah, ayah: verse.ayah, surahName: verse.surahName }))} />
    {passages.length ? <TafsirPassageLibrary passages={passages} /> : <div className="notes-onboarding"><BookOpenText size={23} /><div><strong>Create your first thematic passage</strong><span>Keep one connected discussion in one careful, manual document.</span></div></div>}
    {prepared.length ? <section className="prepared-notes"><div className="section-title-row"><div><span className="section-label">Ayah-specific notes</span><h2>Your prepared exceptions</h2></div><span className="notes-count">{prepared.length} ayat</span></div><div className="prepared-notes-grid">{prepared.slice(0, 8).map((verse) => <Link className="prepared-note" prefetch={false} href={`/tafsir-notes/${verse.surah}/${verse.ayah}`} key={`${verse.surah}:${verse.ayah}`}><span>{verse.surahName} {verse.surah}:{verse.ayah}</span><strong>{verse.theme || "Tafsir notes in progress"}</strong><small>{verse.completedSections} sections prepared</small><ChevronRight size={18} /></Link>)}</div></section> : null}
    <section className="verse-library"><div className="section-title-row"><div><span className="section-label">Juz 14</span><h2>Ayah library</h2><p>Open an ayah for its own note, or see the passages that include it.</p></div></div>{surahs.map((surah) => { const group = verses.filter((verse) => verse.surah === surah); return <details className="surah-library" key={surah} open={surah === surahs[0]}><summary><span><strong>Surah {group[0]?.surahName}</strong><small>{group.length} ayat</small></span><ChevronRight size={19} /></summary><div className="ayah-link-grid">{group.map((verse) => <Link className={verse.completedSections ? "ayah-note-link prepared" : "ayah-note-link"} prefetch={false} href={`/tafsir-notes/${verse.surah}/${verse.ayah}`} key={`${verse.surah}:${verse.ayah}`}><span>{verse.ayah}</span>{verse.completedSections ? <i aria-label="Notes prepared" /> : null}</Link>)}</div></details>; })}</section>
  </main>;
}
