"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { JUZ_14 } from "@/lib/juz14";

type DashboardData = {
  learner: { xp: number; streakDays: number };
  due: number;
  weak: number;
  mastered: number;
  pages: Array<{
    unitNumber: number;
    mushafPage: number;
    surahLabel: string | null;
    verseRange: string | null;
    wordCount: number;
    coreWordCount: number;
    progress: { masteryStars: number; completed: boolean; bestAccuracy: number } | null;
  }>;
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw new Error("Dashboard unavailable");
        return r.json();
      })
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  const pageMap = useMemo(
    () => new Map(data?.pages.map((p) => [p.unitNumber, p]) ?? []),
    [data]
  );
  const completed = data?.pages.filter((p) => p.progress?.completed).length ?? 0;
  const nextUnit = data?.pages.find((p) => !p.progress?.completed)?.unitNumber ?? 20;

  return (
    <main className="shell">
      <nav className="topbar">
        <Link className="brand" href="/">TafsirVocab</Link>
        <div className="nav-links">
          <Link href="/review">Review</Link>
          <Link href="/weak-words">Weak Words</Link>
          <Link href="/tafsir-practice">Tafsir Practice</Link>
          <Link href="/setup">Setup</Link>
        </div>
      </nav>

      <section className="hero hero-home">
        <div>
          <div className="kicker">English Tafsir · Juz 14</div>
          <h1>Build Qur&apos;anic vocabulary that you can actually recall.</h1>
          <p className="lead">
            Learn page by page, retrieve meanings without choices, revisit weak words,
            and move from vocabulary into English Tafsir explanation.
          </p>
        </div>
        <div className="hero-panel">
          <span className="eyebrow">Continue</span>
          <strong>Unit {nextUnit}</strong>
          <span>Mushaf page {261 + nextUnit}</span>
          <Link className="button button-primary" href={`/learn/14/${nextUnit}`}>Continue learning →</Link>
        </div>
      </section>

      {failed && (
        <div className="notice">Database belum siap. <Link href="/setup"><strong>Open setup diagnostics →</strong></Link></div>
      )}

      <section className="stats">
        <div className="card stat"><strong>{data?.learner.xp ?? 0}</strong><span>XP earned</span></div>
        <div className="card stat"><strong>{data?.learner.streakDays ?? 0}🔥</strong><span>Day streak</span></div>
        <div className="card stat"><strong>{data?.due ?? 0}</strong><span>Due for review</span></div>
        <div className="card stat"><strong>{data?.mastered ?? 0}</strong><span>Mastered words</span></div>
      </section>

      <section className="section-head">
        <div>
          <div className="kicker">Learning path</div>
          <h2>Juz 14 · 20 pages</h2>
          <p className="muted">Al-Hijr → An-Nahl · Mushaf pages 262–281</p>
        </div>
        <div className="completion-ring">{completed}/20</div>
      </section>

      <section className="path">
        {JUZ_14.units.map((unit) => {
          const page = pageMap.get(unit.unitNumber);
          const stars = page?.progress?.completed ? (page.progress.masteryStars ?? 0) : 0;
          const previous = unit.unitNumber === 1 ? null : pageMap.get(unit.unitNumber - 1);
          const unlocked = unit.unitNumber === 1 || Boolean(page?.progress) || Boolean(previous?.progress?.completed);
          return (
            <Link
              className={`card unit ${unlocked ? "" : "unit-locked"}`}
              href={unlocked ? `/learn/14/${unit.unitNumber}` : "#"}
              key={unit.unitNumber}
              aria-disabled={!unlocked}
            >
              <div className="unit-top">
                <span className="badge">Unit {unit.unitNumber}</span>
                <span className="stars" aria-label={`${stars} mastery stars`}>{"★".repeat(stars)}{"☆".repeat(3 - stars)}</span>
              </div>
              <span className="unit-number">{String(unit.unitNumber).padStart(2, "0")}</span>
              <strong>{page?.surahLabel ?? "Juz 14"}</strong>
              <span className="muted">{page?.verseRange ?? `Mushaf p. ${unit.mushafPage}`}</span>
              {page?.coreWordCount ? <span className="tiny">{page.coreWordCount} core words</span> : null}
            </Link>
          );
        })}
      </section>

      <section className="action-grid">
        <Link className="feature-card" href="/review"><span>⟳</span><div><strong>Spaced Review</strong><p>{data?.due ?? 0} words due now</p></div></Link>
        <Link className="feature-card" href="/weak-words"><span>↯</span><div><strong>Weak Words</strong><p>Attack repeated mistakes</p></div></Link>
        <Link className="feature-card" href="/tafsir-practice"><span>◌</span><div><strong>Tafsir Practice</strong><p>Explain Qur&apos;anic vocabulary in English</p></div></Link>
      </section>
    </main>
  );
}
