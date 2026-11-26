import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Target } from "lucide-react";
import SentencePracticeLauncher from "@/components/SentencePracticeLauncher";
import PronunciationAudio from "@/components/PronunciationAudio";
import { sentencePageDetail } from "@/lib/sentence-course";
import { getLearnerId } from "@/lib/session";
import { MODE_LABELS, sentenceStatus, type SentenceMode } from "@/lib/sentence-quiz";
export const dynamic = "force-dynamic";
export default async function SentencePage({ params }: { params: Promise<{ page: string }> }) {
  const number = Number((await params).page);
  if (!Number.isInteger(number) || number < 262 || number > 281) notFound();
  const page = await sentencePageDetail(number, await getLearnerId());
  if (!page) notFound();
  const ready = page.sentenceSegments.filter((segment) => segment.curationStatus === "READY");
  return <main className="shell narrow-shell"><Link className="sentence-back" href="/sentences"><ArrowLeft size={17} /> All Mushaf pages</Link><section className="page-heading"><div><div className="kicker">Sentence Translation · Juz 14</div><h1>Page {number} — {page.surahLabel ?? "Juz 14"}</h1><p>{page.verseRange} · {ready.length} sentence groups</p></div></section>
    {ready.length ? <section className="sentence-page-actions"><SentencePracticeLauncher page={number} label="Practice this page" listening={ready.every((segment) => segment.audioVerified)} /><Link href={`/sentences/weak?page=${number}`} className="button button-secondary"><Target size={17} /> Review weak sentences</Link></section> : <div className="notice">Sentence material is pending source import and curation.</div>}
    <div className="sentence-group-list">{page.sentenceSegments.map((segment) => {
      const progress = segment.progresses[0];
      const status = sentenceStatus(progress);
      const total = (progress?.correctCount ?? 0) + (progress?.wrongCount ?? 0);
      return <article className="sentence-group" key={segment.id}><div className="sentence-group-heading"><div><span className="kicker">Ayah {segment.verse.surah}:{segment.verse.ayahNumber}</span><h2>Sentence group {segment.segmentOrder}</h2></div><span className={`sentence-status ${status.toLowerCase().replaceAll(" ", "-")}`}>{segment.curationStatus === "READY" ? status : "Pending curation"}</span></div>
        <p className="arabic sentence-arabic" lang="ar" dir="rtl">{segment.arabicText}</p>
        {segment.audioVerified && segment.audioUrl ? <div className="sentence-recitation"><PronunciationAudio src={segment.audioUrl} label={`Play Arabic sentence ${segment.verse.surah}:${segment.verse.ayahNumber}`} /><span>Listen to the sentence</span></div> : null}
        <div className="sentence-group-meta"><span>{total} attempts</span><span>{total ? Math.round(progress.correctCount / total * 100) : 0}% recall accuracy</span><span>{progress?.masteryLevel.toLowerCase() ?? "new"}</span>{progress?.nextReviewAt ? <span>Next review: {progress.nextReviewAt.toLocaleDateString("en-GB", { timeZone: "Asia/Singapore" })}</span> : null}</div>
        <details className="sentence-disclosure"><summary>Show translation & source</summary><div><p>{segment.englishTranslation ?? "Translation pending curation."}</p>{segment.indonesianTranslation ? <p className="muted" lang="id">{segment.indonesianTranslation}</p> : null}<p className="tiny">{segment.translationSource}{segment.sourceUrl ? <> · <a href={segment.sourceUrl} target="_blank" rel="noreferrer">View source</a></> : null}</p>{segment.contextNote ? <p>{segment.contextNote}</p> : null}</div></details>
        <details className="sentence-disclosure"><summary>Practice history</summary><div>{segment.attempts.length ? segment.attempts.map((attempt, index) => <p className="tiny" key={index}>{attempt.correct ? "Correct" : "Needs practice"} · {MODE_LABELS[attempt.session.mode as SentenceMode]} · {attempt.createdAt.toLocaleString("en-GB", { timeZone: "Asia/Singapore" })}</p>) : <p className="tiny">No practice yet.</p>}</div></details>
        {segment.curationStatus === "READY" ? <SentencePracticeLauncher page={number} segmentId={segment.id} label="Practice this sentence" listening={segment.audioVerified} compact /> : null}
      </article>;
    })}</div>
  </main>;
}
