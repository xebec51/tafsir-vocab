"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Inbox, RotateCcw, Volume2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CourseWord } from "@/lib/course";
import { announceProgressUpdated } from "@/lib/progress-client";
import { speakEnglish } from "@/lib/speech";
import { advanceMasteryQueue, shuffleReviewQueue } from "@/lib/mastery-queue";

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s'-]/g, " ").replace(/\s+/g, " ").trim().replace(/^(the|a|an|to)\s+/, "");
}

export default function ReviewSession({
  words,
  distractors,
  mode,
  nextSessionHref,
  sessionNumber,
  sessionTotal
}: {
  words: CourseWord[];
  distractors: CourseWord[];
  mode: "due" | "all" | "weak" | "page";
  nextSessionHref?: string;
  sessionNumber?: number;
  sessionTotal?: number;
}) {
  const [queue, setQueue] = useState<CourseWord[]>(() => shuffleReviewQueue(words));
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<null | boolean>(null);
  const [score, setScore] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [correctAttempts, setCorrectAttempts] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [checking, setChecking] = useState(false);
  const started = useRef(Date.now());
  const responseTime = useRef(0);
  const sessionId = useRef<string | null>(null);
  const activeAttemptId = useRef<string | null>(null);
  const recordedAttemptIds = useRef(new Set<string>());
  const router = useRouter();
  const sessionScore = attemptCount ? Math.round((correctAttempts / attemptCount) * 100) : 0;

  useEffect(() => {
    if (queue.length || !nextSessionHref) return;
    const timer = window.setTimeout(() => router.replace(nextSessionHref), 700);
    return () => window.clearTimeout(timer);
  }, [nextSessionHref, queue.length, router]);

  const word = queue[0];
  const options = useMemo(() => {
    if (!word) return [];
    const pool = [...words, ...distractors]
      .filter((candidate) => candidate.lexemeId !== word.lexemeId)
      .map((candidate) => candidate.english)
      .filter(Boolean);
    const unique = [...new Set(pool)];
    const seed = word.lexemeId * 41 + queue.length;
    const shuffled = [...unique].sort((a, b) => ((a.length * 17 + seed) % 97) - ((b.length * 17 + seed) % 97));
    return [word.english, ...shuffled.slice(0, 3)]
      .sort((a, b) => ((a.charCodeAt(0) + seed) % 13) - ((b.charCodeAt(0) + seed) % 13));
  }, [distractors, queue.length, word, words]);

  if (!words.length) return <div className="empty-state"><span className="empty-icon"><Inbox size={28} /></span><h2>{mode === "all" ? "No learned words yet." : mode === "weak" ? "No weak words need remediation." : mode === "page" ? "No page vocabulary is available yet." : "You're caught up."}</h2><p>{mode === "weak" ? "Words leave Weak Focus after three correct recall rounds." : mode === "all" ? "Complete your first lesson to add vocabulary to this review." : mode === "page" ? "Import the Juz 14 vocabulary, then return to review this page." : "No words are due right now. You can still review everything you have learned."}</p><div className="toolbar centered">{mode === "due" ? <Link className="button button-primary" href="/review?scope=all">Review all learned words</Link> : null}<Link className="button button-secondary" href="/">Return to learning path</Link></div></div>;
  async function check(response: string) {
    if (feedback !== null || checking) return;
    setChecking(true); setSaveError(""); setAnswer(response);
    responseTime.current = Date.now() - started.current;
    try {
      if (!sessionId.current) {
        const created = await fetch("/api/study-sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: mode === "weak" ? "WEAK" : mode === "all" ? "ALL" : "REVIEW", wordIds: words.map((item) => item.lexemeId) }) });
        const payload = await created.json().catch(() => ({}));
        if (!created.ok || typeof payload.id !== "string") throw new Error(payload.error || "Review session could not be started.");
        sessionId.current = payload.id;
      }
      activeAttemptId.current ??= crypto.randomUUID();
      const saved = await fetch(`/api/study-sessions/${sessionId.current}/attempts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ attemptId: activeAttemptId.current, questionKey: `${word.lexemeId}:SRS_REVIEW`, response, responseTimeMs: responseTime.current }) });
      const payload = await saved.json().catch(() => ({}));
      if (!saved.ok || typeof payload.correct !== "boolean") throw new Error(payload.error || "Review progress could not be saved.");
      const attemptId = activeAttemptId.current;
      if (attemptId && !recordedAttemptIds.current.has(attemptId)) {
        recordedAttemptIds.current.add(attemptId);
        setAttemptCount((count) => count + 1);
        if (payload.correct) setCorrectAttempts((count) => count + 1);
      }
      setFeedback(payload.correct);
      announceProgressUpdated();
    } catch (error) { setSaveError(error instanceof Error ? error.message : "Review progress could not be saved. Try again."); }
    finally { setChecking(false); }
  }

  async function next() {
    if (feedback === null || saving) return;
    setSaving(true);
    setSaveError("");
    try {
      if (!sessionId.current) throw new Error("Review session could not be recovered.");
      if (feedback && queue.length === 1) {
        const result = await fetch(`/api/study-sessions/${sessionId.current}/finalize`, { method: "POST" });
        const payload = await result.json().catch(() => null) as { error?: string } | null;
        if (!result.ok) throw new Error(payload?.error ?? "Review session could not be finalized.");
      }
      if (feedback) {
        setScore((value) => value + 1);
        setQueue((items) => advanceMasteryQueue(items, true));
      } else {
        setQueue((items) => advanceMasteryQueue(items, false));
      }
      setAnswer("");
      setFeedback(null);
      activeAttemptId.current = null;
      started.current = Date.now();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Review progress could not be saved. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!queue.length && nextSessionHref) return <div className="result-card"><div className="result-icon"><Check size={34} /></div><div className="kicker">Session {sessionNumber} complete</div><h2>{sessionScore}% session score</h2><p>{correctAttempts} correct answers in {attemptCount} attempts. Preparing session {(sessionNumber ?? 0) + 1} of {sessionTotal}.</p><div className="loading-state"><span className="loading-spinner" /> Opening the next session...</div></div>;

  if (!queue.length) return <div className="result-card"><div className="result-icon"><Check size={34} /></div><div className="kicker">{mode === "weak" ? "Remedial round complete" : mode === "all" ? "Full review mastered" : mode === "page" ? "Page review mastered" : "Review mastered"}</div><h2>{sessionScore}% session score</h2><p>{correctAttempts} correct answers in {attemptCount} attempts. {mode === "weak" ? "Correct recall advanced each word one step toward its 3/3 weak-word target." : mode === "all" ? "Every learned word was answered correctly before this session closed." : mode === "page" ? "Every vocabulary word on this Mushaf page was recalled correctly." : "Every scheduled word was recalled correctly and its SRS interval has been updated."}</p><div className="toolbar centered"><Link className="button button-primary" href={mode === "all" ? "/review?scope=all" : mode === "weak" ? "/weak-words" : mode === "page" ? "/repeat" : "/"}>{mode === "all" ? "Review them again" : mode === "weak" ? "View weak words" : mode === "page" ? "Choose another page" : "Back to dashboard"}</Link>{mode === "all" ? <Link className="button button-secondary" href="/">Dashboard</Link> : null}</div></div>;

  return (
    <div className="exercise-card review-card">
      <div className="quiz-status"><span><RotateCcw size={15} /> {mode === "weak" ? "Weak-word remediation" : mode === "all" ? `All learned words${sessionNumber ? ` · Session ${sessionNumber}/${sessionTotal}` : ""}` : mode === "page" ? "Mushaf page review" : "Spaced review"}</span><strong>{sessionScore}% score <small>{score} / {words.length} mastered</small></strong></div>
      <div className="quiz-progress" role="progressbar" aria-label="Review mastery progress" aria-valuemin={0} aria-valuemax={words.length} aria-valuenow={score}><span style={{ width: `${(score / words.length) * 100}%` }} /></div>
      <p className="question-label">Choose the English meaning for this Qur&apos;anic word.</p>
      <div className="prompt-arabic" lang="ar" dir="rtl">{word.arabic}</div>
      <div className="prompt-meta"><span className="verse-tag">Ayah {word.verseKey}</span><span>{queue.length} to master</span></div>
      <div className="choice-grid review-choice-grid">
        {options.map((option, optionIndex) => {
          const selected = answer === option;
          const expected = normalize(option) === normalize(word.english);
          const state = feedback !== null ? (expected ? "correct-choice" : selected ? "wrong-choice" : "") : selected ? "selected-choice" : "";
          return (
            <button type="button" disabled={feedback !== null || checking} key={option} className={`choice ${state}`} onClick={() => void check(option)}>
              <span className="choice-key">{optionIndex + 1}</span><span>{option}</span>
              {feedback !== null && expected ? <Check className="choice-result-icon" size={19} /> : feedback !== null && selected ? <X className="choice-result-icon" size={19} /> : null}
            </button>
          );
        })}
      </div>
      {feedback !== null ? (
        <div className={`feedback ${feedback ? "feedback-good" : "feedback-bad"}`} role="status" aria-live="polite">
          <span className="feedback-icon" aria-hidden="true">{feedback ? <Check size={22} /> : <X size={22} />}</span>
          <div><strong>{feedback ? "Correct" : "Review this one"}</strong><span className="feedback-answer">Correct answer: {word.english}<button type="button" className="feedback-audio" aria-label={`Hear English pronunciation for ${word.english}`} title="Hear English pronunciation" onClick={() => speakEnglish(word.english)}><Volume2 size={16} /></button></span>{word.indonesian ? <span className="helper">Indonesian <span aria-hidden="true">&middot;</span> {word.indonesian}</span> : null}</div>
          <button type="button" className="button button-primary feedback-next" disabled={saving} onClick={() => void next()}>{saving ? "Saving..." : feedback ? queue.length === 1 ? "Finish" : "Next" : "Practice again later"} {!saving ? <ArrowRight size={18} /> : null}</button>
        </div>
      ) : null}
      {saveError ? <div className="notice notice-error" role="alert">{saveError}</div> : null}
    </div>
  );
}
