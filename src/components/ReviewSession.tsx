"use client";

import Link from "next/link";
import { ArrowRight, Check, Inbox, RotateCcw, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CourseWord } from "@/lib/course";

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s'-]/g, " ").replace(/\s+/g, " ").trim().replace(/^(the|a|an|to)\s+/, "");
}

export default function ReviewSession() {
  const [words, setWords] = useState<CourseWord[]>([]);
  const [distractors, setDistractors] = useState<CourseWord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<null | boolean>(null);
  const [score, setScore] = useState(0);
  const started = useRef(Date.now());

  useEffect(() => {
    fetch("/api/review", { cache: "no-store" }).then((response) => response.json()).then((data) => {
      setWords(data.words ?? []);
      setDistractors(data.distractors ?? []);
      setLoaded(true);
    });
  }, []);

  const word = words[index];
  const options = useMemo(() => {
    if (!word) return [];
    const pool = [...words, ...distractors]
      .filter((candidate) => candidate.lexemeId !== word.lexemeId)
      .map((candidate) => candidate.english)
      .filter(Boolean);
    const unique = [...new Set(pool)];
    const seed = word.lexemeId * 41 + index;
    const shuffled = [...unique].sort((a, b) => ((a.length * 17 + seed) % 97) - ((b.length * 17 + seed) % 97));
    return [word.english, ...shuffled.slice(0, 3)]
      .sort((a, b) => ((a.charCodeAt(0) + seed) % 13) - ((b.charCodeAt(0) + seed) % 13));
  }, [distractors, index, word, words]);

  if (!loaded) return <div className="loading-state"><span className="loading-spinner" /><span>Preparing your review queue</span></div>;
  if (!words.length) return <div className="empty-state"><span className="empty-icon"><Inbox size={28} /></span><h2>You&apos;re caught up.</h2><p>No words are due right now. Complete a lesson to build your review queue.</p><Link className="button button-primary" href="/">Return to learning path</Link></div>;
  if (index >= words.length) return <div className="result-card"><div className="result-icon"><Check size={34} /></div><div className="kicker">Review complete</div><h2>{score} of {words.length} recalled</h2><p>Your SRS intervals have been updated from this session.</p><Link className="button button-primary" href="/">Back to dashboard</Link></div>;

  function check(response: string) {
    if (feedback !== null) return;
    const accepted = word.alternatives.length ? word.alternatives : [word.english];
    const correct = accepted.map(normalize).includes(normalize(response));
    setAnswer(response);
    setFeedback(correct);
    if (correct) setScore((value) => value + 1);
    void fetch("/api/progress/attempt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lexemeId: word.lexemeId, occurrenceId: word.occurrenceId, exerciseType: "SRS_REVIEW", correct, response, responseTimeMs: Date.now() - started.current })
    });
  }

  function next() {
    setIndex((value) => value + 1);
    setAnswer("");
    setFeedback(null);
    started.current = Date.now();
  }

  return (
    <div className="exercise-card review-card">
      <div className="quiz-status"><span><RotateCcw size={15} /> Spaced review</span><strong>{index + 1} / {words.length}</strong></div>
      <div className="quiz-progress" role="progressbar" aria-label="Review progress" aria-valuemin={1} aria-valuemax={words.length} aria-valuenow={index + 1}><span style={{ width: `${((index + 1) / words.length) * 100}%` }} /></div>
      <p className="question-label">Choose the English meaning from your review queue.</p>
      <div className="prompt-arabic" lang="ar" dir="rtl">{word.arabic}</div>
      <div className="prompt-meta"><span className="verse-tag">Ayah {word.verseKey}</span><span>{score} correct this session</span></div>
      <div className="choice-grid review-choice-grid">
        {options.map((option, optionIndex) => {
          const selected = answer === option;
          const expected = normalize(option) === normalize(word.english);
          const state = feedback !== null ? (expected ? "correct-choice" : selected ? "wrong-choice" : "") : selected ? "selected-choice" : "";
          return (
            <button type="button" disabled={feedback !== null} key={option} className={`choice ${state}`} onClick={() => check(option)}>
              <span className="choice-key">{optionIndex + 1}</span><span>{option}</span>
              {feedback !== null && expected ? <Check className="choice-result-icon" size={19} /> : feedback !== null && selected ? <X className="choice-result-icon" size={19} /> : null}
            </button>
          );
        })}
      </div>
      {feedback !== null ? (
        <div className={`feedback ${feedback ? "feedback-good" : "feedback-bad"}`} role="status" aria-live="polite">
          <span className="feedback-icon" aria-hidden="true">{feedback ? <Check size={22} /> : <X size={22} />}</span>
          <div><strong>{feedback ? "Correct" : "Review this one"}</strong><span>Correct answer: {word.english}</span>{word.indonesian ? <span className="helper">Indonesian <span aria-hidden="true">&middot;</span> {word.indonesian}</span> : null}</div>
          <button type="button" className="button button-primary feedback-next" onClick={next}>Next <ArrowRight size={18} /></button>
        </div>
      ) : null}
    </div>
  );
}
