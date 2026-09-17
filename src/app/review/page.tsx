import Link from "next/link";
import ReviewSession from "@/components/ReviewSession";
export default function ReviewPage() { return <main className="shell narrow-shell"><nav className="topbar"><Link className="brand" href="/">← TafsirVocab</Link><Link href="/weak-words">Weak Words</Link></nav><section className="page-heading"><div className="kicker">Spaced repetition</div><h1>Review due words</h1><p className="lead">No multiple choice here. Retrieval practice is what turns familiar vocabulary into vocabulary you can use during Tafsir.</p></section><ReviewSession /></main>; }
