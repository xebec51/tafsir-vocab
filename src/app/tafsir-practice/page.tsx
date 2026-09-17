import Link from "next/link";
import TafsirPractice from "@/components/TafsirPractice";
export default function TafsirPracticePage() { return <main className="shell narrow-shell"><nav className="topbar"><Link className="brand" href="/">← TafsirVocab</Link><Link href="/review">Review</Link></nav><section className="page-heading"><div className="kicker">Competition bridge</div><h1>English Tafsir Practice</h1><p className="lead">Move beyond one-word translation: explain vocabulary clearly and connect it to the ayah context in English.</p></section><TafsirPractice /></main>; }
