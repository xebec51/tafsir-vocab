import Link from "next/link";
import { BookOpenText, ChevronRight, FileText } from "lucide-react";
import { getLearnerId } from "@/lib/session";
import { getTafsirVerseIndex } from "@/lib/tafsir-notes";

export const dynamic = "force-dynamic";

export default async function TafsirNotesPage() {
  const learnerId = await getLearnerId();
  const verses = await getTafsirVerseIndex(learnerId);
  const prepared = verses.filter((verse) => verse.completedSections > 0);
  const surahs = [...new Set(verses.map((verse) => verse.surah))];
  return <main className="shell notes-index-shell">
    <section className="page-heading"><span className="page-heading-icon"><FileText size={23} /></span><div><div className="kicker">Musabaqah study library</div><h1>Tafsir Notes</h1><p>Build structured, verse-by-verse notes for English Tafsir preparation.</p></div></section>
    {prepared.length ? <section className="prepared-notes"><div className="section-title-row"><div><span className="section-label">Continue studying</span><h2>Your prepared ayat</h2></div><span className="notes-count">{prepared.length} ayat</span></div><div className="prepared-notes-grid">{prepared.slice(0, 8).map((verse) => <Link className="prepared-note" prefetch={false} href={`/tafsir-notes/${verse.surah}/${verse.ayah}`} key={`${verse.surah}:${verse.ayah}`}><span>{verse.surahName} {verse.surah}:{verse.ayah}</span><strong>{verse.theme || "Tafsir notes in progress"}</strong><small>{verse.completedSections} sections prepared</small><ChevronRight size={18} /></Link>)}</div></section> : <div className="notes-onboarding"><BookOpenText size={23} /><div><strong>Start with an ayah from Juz 14</strong><span>Your structured notes will appear here for quick access.</span></div></div>}
    <section className="verse-library"><div className="section-title-row"><div><span className="section-label">Juz 14</span><h2>Ayah library</h2><p>Choose an ayah to read or prepare its tafsir notes.</p></div></div>{surahs.map((surah) => { const group = verses.filter((verse) => verse.surah === surah); return <details className="surah-library" key={surah} open={surah === surahs[0]}><summary><span><strong>Surah {group[0]?.surahName}</strong><small>{group.length} ayat</small></span><ChevronRight size={19} /></summary><div className="ayah-link-grid">{group.map((verse) => <Link className={verse.completedSections ? "ayah-note-link prepared" : "ayah-note-link"} prefetch={false} href={`/tafsir-notes/${verse.surah}/${verse.ayah}`} key={`${verse.surah}:${verse.ayah}`}><span>{verse.ayah}</span>{verse.completedSections ? <i aria-label="Notes prepared" /> : null}</Link>)}</div></details>; })}</section>
  </main>;
}
