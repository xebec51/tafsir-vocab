import Link from "next/link";
import SentencePracticeLauncher from "@/components/SentencePracticeLauncher";
import { prisma } from "@/lib/prisma";
import { getLearnerId } from "@/lib/session";
export const dynamic = "force-dynamic";
export default async function SentenceReviewPage() {
  const learnerId = await getLearnerId();
  const due = await prisma.sentenceProgress.findMany({ where: { learnerId, nextReviewAt: { lte: new Date() }, segment: { curationStatus: "READY", page: { juzId: 14 } } }, orderBy: { nextReviewAt: "asc" }, take: 100, include: { segment: { include: { verse: true, page: true } } } });
  return <main className="shell narrow-shell"><Link href="/sentences" className="sentence-back">Sentence Translation</Link><section className="page-heading"><div><div className="kicker">Spaced recall</div><h1>Sentence review</h1><p>{due.length} sentence groups ready for review. Each session contains up to 100 groups.</p></div></section>{due.length ? <SentencePracticeLauncher scope="due" label="Start due review" /> : <div className="empty-state"><h2>You are caught up</h2><p>Explore a page or strengthen a weak sentence.</p><Link className="button button-primary" href="/sentences/weak">Weak sentences</Link></div>}<div className="sentence-review-list">{due.map((item) => <Link key={item.id} href={`/sentences/${item.segment.page.mushafPage}`}><span>Page {item.segment.page.mushafPage} · Ayah {item.segment.verse.surah}:{item.segment.verse.ayahNumber}</span><span className="arabic" lang="ar" dir="rtl">{item.segment.arabicText}</span></Link>)}</div></main>;
}
