import Link from "next/link";
import { JUZ_14 } from "@/lib/juz14";

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <div className="kicker">Qur'anic English Vocabulary</div>
        <h1>TafsirVocab</h1>
        <p>
          Master Juz 14 page by page. Arabic → English first, then recall,
          context, review, and Tafsir practice.
        </p>
      </section>

      <section className="stats">
        <div className="card stat"><strong>14</strong><span>Current Juz</span></div>
        <div className="card stat"><strong>20</strong><span>Learning units</span></div>
        <div className="card stat"><strong>262–281</strong><span>Mushaf pages</span></div>
        <div className="card stat"><strong>0 XP</strong><span>Start learning</span></div>
      </section>

      <div className="toolbar">
        <Link className="button" href="/learn/14/1">Start Page 1</Link>
        <Link className="button" href="/review">Review Due Words</Link>
      </div>

      <section>
        <div className="kicker">Learning Path</div>
        <h2>Juz 14</h2>
        <p className="muted">Al-Hijr → An-Nahl</p>

        <div className="path">
          {JUZ_14.units.map((unit) => (
            <Link
              className="card unit"
              href={`/learn/14/${unit.unitNumber}`}
              key={unit.unitNumber}
            >
              <span className="badge">Unit {unit.unitNumber}</span>
              <span className="unit-number">{String(unit.unitNumber).padStart(2, "0")}</span>
              <span className="muted">Mushaf p. {unit.mushafPage}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
