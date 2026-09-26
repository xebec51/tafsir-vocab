"use client";

import Link from "next/link";
import { BookOpenText, Check, ClipboardCheck, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import type { CourseWord } from "@/lib/course";
import { announceProgressUpdated } from "@/lib/progress-client";

export default function TafsirPractice() {
  const [words, setWords] = useState<CourseWord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    fetch("/api/practice", { cache: "no-store" }).then((response) => response.json()).then((data) => {
      setWords(data.words ?? []);
      setLoaded(true);
    });
  }, []);

  if (!loaded) return <div className="loading-state"><span className="loading-spinner" /><span>Preparing a Tafsir prompt</span></div>;
  if (!words.length) return <div className="empty-state"><span className="empty-icon"><BookOpenText size={28} /></span><h2>Tafsir Practice is not unlocked yet.</h2><p>Complete lessons first. This drill reuses vocabulary you have actually studied.</p><Link className="button button-primary" href="/">Open learning path</Link></div>;

  const word = words[index % words.length];

  async function rate(correct: boolean) {
    if (saving) return;
    setSaving(true);
    setSaveError("");
    try {
      const result = await fetch("/api/progress/attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lexemeId: word.lexemeId, occurrenceId: word.occurrenceId, exerciseType: "TAFSIR_EXPLANATION", correct, response: answer, responseTimeMs: 0 })
      });
      if (!result.ok) throw new Error("Tafsir progress could not be saved.");
      announceProgressUpdated();
      setIndex((value) => value + 1);
      setAnswer("");
      setRevealed(false);
    } catch {
      setSaveError("Tafsir progress could not be saved. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="exercise-card tafsir-card">
      <div className="tafsir-round">
        <span><ClipboardCheck size={17} /> Competition drill</span>
        <strong>Prompt {(index % words.length) + 1} of {words.length}</strong>
      </div>
      <div className="context-box tafsir-context"><span>Ayah {word.verseKey}</span><div className="arabic context-arabic" lang="ar" dir="rtl">{word.contextArabic}</div></div>
      <div className="tafsir-prompt">
        <span className="section-label">Your task</span>
        <h2>Explain <span className="inline-arabic" lang="ar" dir="rtl">{word.arabic}</span> in English.</h2>
        <p>Give the lexical meaning, then explain its function in this ayah with precise wording.</p>
      </div>
      <div className="rubric" aria-label="Answer rubric">
        <span><strong>01</strong> Meaning</span><span><strong>02</strong> Function</span><span><strong>03</strong> Context</span>
      </div>
      <label className="input-label" htmlFor="tafsir-answer">Your explanation</label>
      <textarea id="tafsir-answer" className="tafsir-input" value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="The word means... In this ayah, it refers to..." />
      <div className="response-count">{answer.trim().split(/\s+/).filter(Boolean).length} words</div>
      {!revealed ? (
        <button type="button" className="button button-primary button-wide" disabled={!answer.trim()} onClick={() => setRevealed(true)}>Compare with key meaning</button>
      ) : (
        <div className="feedback feedback-neutral tafsir-feedback" role="status">
          <span className="feedback-icon"><BookOpenText size={22} /></span>
          <div><strong>Key lexical meaning</strong><span className="key-meaning">{word.english}</span>{word.indonesian ? <span className="helper">Indonesian <span aria-hidden="true">&middot;</span> {word.indonesian}</span> : null}<span className="helper">Check that your explanation preserves the verse context, not only the dictionary gloss.</span></div>
          <div className="rating-actions"><button type="button" className="button button-secondary" disabled={saving} onClick={() => void rate(false)}><RotateCcw size={17} /> {saving ? "Saving..." : "Need practice"}</button><button type="button" className="button button-primary" disabled={saving} onClick={() => void rate(true)}><Check size={17} /> {saving ? "Saving..." : "Explained well"}</button></div>
        </div>
      )}
      {saveError ? <div className="notice notice-error" role="alert">{saveError}</div> : null}
    </div>
  );
}
