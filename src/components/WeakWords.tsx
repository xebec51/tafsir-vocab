"use client";
import { useEffect, useState } from "react";

type WeakWord = { lexemeId: number; arabic: string; english: string | null; root: string | null; correctCount: number; wrongCount: number; masteryLevel: string; verseKey: string | null };
export default function WeakWords() {
  const [words, setWords] = useState<WeakWord[] | null>(null);
  useEffect(() => { fetch("/api/weak-words", { cache: "no-store" }).then((r) => r.json()).then((d) => setWords(d.words ?? [])); }, []);
  if (!words) return <div className="empty-state">Loading weak words…</div>;
  if (!words.length) return <div className="empty-state"><h2>No weak words yet.</h2><p>Mistakes from lessons and reviews will automatically appear here.</p></div>;
  return <div className="weak-list">{words.map((w) => {
    const total = w.correctCount + w.wrongCount;
    const rate = total ? Math.round((w.correctCount / total) * 100) : 0;
    return <article className="weak-row" key={w.lexemeId}><div><div className="arabic-word compact">{w.arabic}</div><strong>{w.english}</strong><div className="word-meta">{w.verseKey ? <span>{w.verseKey}</span> : null}{w.root ? <span>Root · {w.root}</span> : null}<span>{w.masteryLevel}</span></div></div><div className="weak-score"><strong>{rate}%</strong><span>{w.wrongCount} mistakes</span></div></article>;
  })}</div>;
}
