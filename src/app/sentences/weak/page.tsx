import Link from "next/link";
import { notFound } from "next/navigation";
import SentencePracticeLauncher from "@/components/SentencePracticeLauncher";
import { prisma } from "@/lib/prisma";
import { getLearnerId } from "@/lib/session";
export const dynamic = "force-dynamic";
export default async function WeakSentencesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const pageParam = (await searchParams).page;
  const page = pageParam ? Number(pageParam) : undefined;
  if (page !== undefined && (!Number.isInteger(page) || page < 262 || page > 281)) notFound();
  const learnerId = await getLearnerId();
  const weak = await prisma.sentenceProgress.findMany({ where: { learnerId, segment: { curationStatus: "READY", page: { juzId: 14, mushafPage: page } }, OR: [{ wrongCount: { gt: 0 }, masteryLevel: { in: ["NEW", "LEARNING"] } }, { nextReviewAt: { lte: new Date() } }] }, orderBy: [{ wrongCount: "desc" }, { lastReviewedAt: "asc" }], take: 100, include: { segment: { include: { verse: true, page: true } } } });
  return <main className="shell narrow-shell"><Link href="/sentences" className="sentence-back">Sentence Translation</Link><section className="page-heading"><div><div className="kicker">Focused practice</div><h1>Weak sentences</h1><p>{page ? `Page ${page} · ` : ""}{weak.length} groups to strengthen, prioritised by mistakes and review history.</p></div></section>{weak.length ? <SentencePracticeLauncher scope="weak" page={page} label="Review weak sentences" /> : <div className="empty-state"><h2>No weak sentences yet</h2><p>Complete sentence practice to build your recall history.</p><Link href="/sentences" className="button button-primary">Choose a page</Link></div>}<div className="sentence-group-list">{weak.map((item) => <article key={item.id} className="sentence-group"><div className="sentence-group-heading"><span className="verse-tag">Page {item.segment.page.mushafPage} · {item.segment.verse.surah}:{item.segment.verse.ayahNumber}</span><strong>{Math.round(item.correctCount / Math.max(1, item.correctCount + item.wrongCount) * 100)}% accuracy</strong></div><p className="arabic sentence-arabic" lang="ar" dir="rtl">{item.segment.arabicText}</p><p className="tiny">{item.wrongCount} mistakes · {item.correctCount} correct · Last practiced {item.lastReviewedAt?.toLocaleDateString("en-GB", { timeZone: "Asia/Singapore" }) ?? "never"}</p><SentencePracticeLauncher scope="weak" segmentId={item.segmentId} label="Practice this sentence" compact /></article>)}</div></main>;
}
