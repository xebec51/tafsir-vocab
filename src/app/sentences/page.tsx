import Link from "next/link";
import { Languages, RotateCcw, Target } from "lucide-react";
import SentenceLibrary from "@/components/SentenceLibrary";
import { sentencePageSummaries } from "@/lib/sentence-course";
import { getLearnerId } from "@/lib/session";
export const dynamic = "force-dynamic";
export default async function SentencesPage() {
  const pages = await sentencePageSummaries(await getLearnerId());
  return <main className="shell"><section className="page-heading"><span className="page-heading-icon"><Languages size={24} /></span><div><div className="kicker">Meaning & context</div><h1>Sentence Translation</h1><p>Practice translating Quranic verses sentence by sentence to understand their complete meaning and context.</p></div></section><div className="sentence-subnav"><Link href="/">Word Quiz</Link><Link href="/sentences/review"><RotateCcw size={16} /> Sentence review</Link><Link href="/sentences/weak"><Target size={16} /> Weak sentences</Link></div><SentenceLibrary pages={pages} /></main>;
}
