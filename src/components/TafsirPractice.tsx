"use client";
import { useEffect, useState } from "react";
import type { CourseWord } from "@/lib/course";

export default function TafsirPractice() {
  const [words, setWords] = useState<CourseWord[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  useEffect(() => { fetch("/api/practice", { cache: "no-store" }).then((r) => r.json()).then((d) => setWords(d.words ?? [])); }, []);
  if (!words.length) return <div className="empty-state"><h2>Tafsir practice unlocks from learned vocabulary.</h2><p>Complete lessons first. Due/reviewed words are reused here so the explanation exercise follows what you have actually studied.</p></div>;
  const word = words[index % words.length];
  function rate(correct: boolean) {
    void fetch("/api/progress/attempt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lexemeId: word.lexemeId, occurrenceId: word.occurrenceId, exerciseType: "TAFSIR_EXPLANATION", correct, response: answer, responseTimeMs: 0 }) });
    setIndex((i) => i + 1); setAnswer(""); setRevealed(false);
  }
  return <div className="exercise-card"><div className="exercise-kicker">English Tafsir · Self-explanation</div><div className="context-box"><span>{word.verseKey}</span><div className="arabic context-arabic">{word.contextArabic}</div></div><h2>Explain <span className="inline-arabic">{word.arabic}</span> in English.</h2><p className="muted">Give its meaning, then explain how it functions in this ayah. Speak aloud first if possible, then type a concise version.</p><textarea className="tafsir-input" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Example: The word ... means ... In this verse, it refers to ..." />{!revealed ? <button className="button button-primary button-wide" disabled={!answer.trim()} onClick={() => setRevealed(true)}>Compare with key meaning</button> : <div className="feedback feedback-neutral"><div><strong>Key lexical meaning</strong><span>{word.english}</span>{word.indonesian ? <span className="helper">ID · {word.indonesian}</span> : null}<span className="helper">Your explanation should preserve the verse context, not only the dictionary gloss.</span></div><div className="rating-actions"><button className="button button-secondary" onClick={() => rate(false)}>Need practice</button><button className="button button-primary" onClick={() => rate(true)}>Explained well</button></div></div>}</div>;
}
