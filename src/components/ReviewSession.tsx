"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { CourseWord } from "@/lib/course";

function normalize(value: string) { return value.toLowerCase().replace(/[^a-z0-9\s'-]/g, " ").replace(/\s+/g, " ").trim().replace(/^(the|a|an|to)\s+/, ""); }

export default function ReviewSession() {
  const [words, setWords] = useState<CourseWord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<null | boolean>(null);
  const [score, setScore] = useState(0);
  const started = useRef(Date.now());

  useEffect(() => {
    fetch("/api/review", { cache: "no-store" }).then((r) => r.json()).then((d) => { setWords(d.words ?? []); setLoaded(true); });
  }, []);

  if (!loaded) return <div className="empty-state">Loading review queue…</div>;
  if (!words.length) return <div className="empty-state"><h2>You&apos;re caught up.</h2><p>No words are due right now. Complete a lesson to build your review queue.</p><Link className="button button-primary" href="/">Return to learning path</Link></div>;
  if (index >= words.length) return <div className="result-card"><div className="result-icon">✓</div><div className="kicker">Review complete</div><h2>{score}/{words.length} recalled</h2><p>Your SRS intervals have been updated based on this session.</p><Link className="button button-primary" href="/">Dashboard</Link></div>;

  const word = words[index];
  function check() {
    const accepted = word.alternatives.length ? word.alternatives : [word.english];
    const correct = accepted.map(normalize).includes(normalize(answer));
    setFeedback(correct);
    if (correct) setScore((s) => s + 1);
    void fetch("/api/progress/attempt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lexemeId: word.lexemeId, occurrenceId: word.occurrenceId, exerciseType: "SRS_REVIEW", correct, response: answer, responseTimeMs: Date.now() - started.current }) });
  }
  function next() { setIndex((i) => i + 1); setAnswer(""); setFeedback(null); started.current = Date.now(); }

  return <div className="exercise-card">
    <div className="quiz-progress"><span style={{ width: `${((index + 1) / words.length) * 100}%` }} /></div>
    <div className="exercise-kicker">Spaced review · {index + 1}/{words.length}</div>
    <p className="question-label">Recall the English meaning without choices.</p>
    <div className="prompt-arabic">{word.arabic}</div>
    <span className="verse-tag">{word.verseKey}</span>
    <form className="typing-row" onSubmit={(e) => { e.preventDefault(); if (feedback === null && answer.trim()) check(); }}>
      <input autoFocus disabled={feedback !== null} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Type the meaning…" />
      {feedback === null ? <button className="button button-primary" disabled={!answer.trim()}>Check</button> : <button type="button" className="button button-primary" onClick={next}>Next</button>}
    </form>
    {feedback !== null ? <div className={`feedback ${feedback ? "feedback-good" : "feedback-bad"}`}><div><strong>{feedback ? "Correct" : "Review this one"}</strong><span>{word.english}</span>{word.indonesian ? <span className="helper">ID · {word.indonesian}</span> : null}</div></div> : null}
  </div>;
}
