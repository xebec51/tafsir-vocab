import Link from "next/link";
import SetupStatus from "@/components/SetupStatus";
export default function SetupPage() {
  return <main className="shell narrow-shell"><nav className="topbar"><Link className="brand" href="/">← TafsirVocab</Link></nav><section className="page-heading"><div className="kicker">Installation diagnostics</div><h1>Setup status</h1><p className="lead">This page never exposes database passwords or Quran Foundation secrets. It only checks whether required services and Juz 14 course data are available.</p></section><SetupStatus /><div className="setup-commands"><h2>Initial setup</h2><pre><code>{`npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run data:import:juz14
npm run data:stats
npm run dev`}</code></pre></div></main>;
}
