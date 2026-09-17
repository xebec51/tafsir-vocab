import Link from "next/link";
import WeakWords from "@/components/WeakWords";
export default function WeakWordsPage() { return <main className="shell narrow-shell"><nav className="topbar"><Link className="brand" href="/">← TafsirVocab</Link><Link href="/review">Review</Link></nav><section className="page-heading"><div className="kicker">Error bank</div><h1>Weak Words</h1><p className="lead">Words are ranked by repeated mistakes so your study time goes where it matters most.</p></section><WeakWords /></main>; }
