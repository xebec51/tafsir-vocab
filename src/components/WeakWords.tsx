"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, Target } from "lucide-react";
import { useEffect, useState } from "react";

type WeakWord = {
  lexemeId: number;
  arabic: string;
  english: string | null;
  root: string | null;
  correctCount: number;
  wrongCount: number;
  masteryLevel: string;
  verseKey: string | null;
};

export default function WeakWords() {
  const [words, setWords] = useState<WeakWord[] | null>(null);

  useEffect(() => {
    fetch("/api/weak-words", { cache: "no-store" }).then((response) => response.json()).then((data) => setWords(data.words ?? []));
  }, []);

  if (!words) return <div className="loading-state"><span className="loading-spinner" /><span>Ranking your priority words</span></div>;
  if (!words.length) return <div className="empty-state"><span className="empty-icon"><CheckCircle2 size={28} /></span><h2>No weak words yet.</h2><p>Mistakes from lessons and reviews will automatically appear here.</p><Link className="button button-primary" href="/">Continue learning</Link></div>;

  return (
    <>
      <div className="weak-summary">
        <span className="priority-icon weak"><Target size={22} /></span>
        <div><strong>{words.length} words need attention</strong><span>Lowest recall rates are shown first.</span></div>
        <Link className="button button-secondary" href="/review">Start review <ArrowRight size={17} /></Link>
      </div>
      <div className="weak-list">
        {words.map((word, index) => {
          const total = word.correctCount + word.wrongCount;
          const rate = total ? Math.round((word.correctCount / total) * 100) : 0;
          const priority = rate < 40 ? "High priority" : rate < 70 ? "Needs practice" : "Keep reviewing";
          return (
            <article className="weak-row" key={word.lexemeId}>
              <span className="weak-rank">{String(index + 1).padStart(2, "0")}</span>
              <div className="weak-word-main">
                <div className="arabic-word compact" lang="ar" dir="rtl">{word.arabic}</div>
                <strong>{word.english}</strong>
                <div className="word-meta">
                  {word.verseKey ? <span>Ayah {word.verseKey}</span> : null}
                  {word.root ? <span>Root <span aria-hidden="true">&middot;</span> {word.root}</span> : null}
                  <span>{word.masteryLevel.toLowerCase()}</span>
                </div>
              </div>
              <div className="weak-score">
                <span className={`priority-label ${rate < 40 ? "urgent" : ""}`}>{priority}</span>
                <strong>{rate}%</strong>
                <span>{word.wrongCount} mistakes</span>
                <div className="mini-progress" aria-label={`${rate}% recall rate`}><span style={{ width: `${rate}%` }} /></div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
