"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, RotateCcw, Star, Volume2, X } from "lucide-react";
import type { CourseWord } from "@/lib/course";
import type { AttemptInput } from "@/lib/progress";
import { normalizeArabic } from "@/lib/arabic";
import { wordAudioUrl } from "@/lib/audio";
import { announceProgressUpdated } from "@/lib/progress-client";
import { speakEnglish } from "@/lib/speech";

type QuestionType = "ARABIC_TO_ENGLISH" | "ENGLISH_TO_ARABIC" | "CONTEXT";
type Question = { type: QuestionType; word: CourseWord };

function normalizeEnglish(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s'-]/g, " ").replace(/\s+/g, " ").trim().replace(/^(the|a|an|to)\s+/, "");
}

function seededShuffle<T>(input: T[], seed: number) {
  const copy = [...input];
  let state = (seed >>> 0) || 1;
  for (let i = copy.length - 1; i > 0; i--) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const j = state % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function optionsFor(word: CourseWord, words: CourseWord[], direction: "en" | "ar") {
  const correct = direction === "en" ? word.english : word.arabic;
  const pool = words
    .filter((candidate) => candidate.lexemeId !== word.lexemeId)
    .map((candidate) => direction === "en" ? candidate.english : candidate.arabic)
    .filter(Boolean);
  const seed = word.lexemeId * 37 + (direction === "en" ? 11 : 23);
  return seededShuffle([correct, ...seededShuffle([...new Set(pool)], seed).slice(0, 3)], seed + 7);
}

async function saveAttempts(attempts: AttemptInput[]) {
  const result = await fetch("/api/progress/attempts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ attempts })
  });
  if (!result.ok) throw new Error("Progress attempts could not be saved.");
}

function MatchingRound({ words, onAttempt, onDone }: { words: CourseWord[]; onAttempt: (word: CourseWord, type: string, correct: boolean, response: string, responseTimeMs: number) => void; onDone: (correct: number) => void }) {
  const [left, setLeft] = useState<CourseWord | null>(null);
  const [right, setRight] = useState<CourseWord | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [mismatch, setMismatch] = useState<Set<number>>(new Set());
  const [mistakes, setMistakes] = useState(0);
  const english = useMemo(() => seededShuffle(words, words.reduce((sum, word) => sum + word.lexemeId, 17)), [words]);

  function chooseLeft(word: CourseWord) {
    if (matched.has(word.lexemeId)) return;
    setLeft(word);
    if (right) resolve(word, right);
  }

  function chooseRight(word: CourseWord) {
    if (matched.has(word.lexemeId)) return;
    setRight(word);
    if (left) resolve(left, word);
  }

  function resolve(arabicWord: CourseWord, englishWord: CourseWord) {
    if (arabicWord.lexemeId === englishWord.lexemeId) {
      const next = new Set(matched).add(arabicWord.lexemeId);
      setMatched(next);
      onAttempt(arabicWord, "MATCH", true, englishWord.english, 0);
      setLeft(null);
      setRight(null);
      if (next.size === words.length) setTimeout(() => onDone(Math.max(0, words.length - mistakes)), 350);
      return;
    }

    setMistakes((value) => value + 1);
    setMismatch(new Set([arabicWord.lexemeId, englishWord.lexemeId]));
    onAttempt(arabicWord, "MATCH", false, englishWord.english, 0);
    setTimeout(() => {
      setLeft(null);
      setRight(null);
      setMismatch(new Set());
    }, 450);
  }

  return (
    <div className="exercise-card matching-card">
      <div className="match-header">
        <div>
          <div className="exercise-kicker">Warm-up <span aria-hidden="true">&middot;</span> Matching</div>
          <h2>Match Arabic with English</h2>
          <p className="muted">Choose an Arabic word, then choose its English meaning.</p>
        </div>
        <div className="match-score" aria-label={`${matched.size} of ${words.length} pairs matched`}>
          <strong>{matched.size}/{words.length}</strong><span>matched</span>
        </div>
      </div>
      <div className={`match-guidance ${left || right ? "active" : ""}`} role="status" aria-live="polite">
        {left && !right ? <>Arabic selected: <span lang="ar" dir="rtl">{left.arabic}</span>. Now choose its English meaning.</> : right && !left ? <>English selected: <strong>{right.english}</strong>. Now choose its Arabic word.</> : left && right ? "Checking your pair..." : "Start by selecting a word from either column."}
      </div>
      <div className="match-headings" aria-hidden="true"><span>Arabic</span><span>English</span></div>
      <div className="match-grid">
        <div className="match-column">
          {words.map((word) => (
            <button
              type="button"
              disabled={matched.has(word.lexemeId)}
              aria-pressed={left?.lexemeId === word.lexemeId}
              key={word.lexemeId}
              className={`match-chip arabic-small ${left?.lexemeId === word.lexemeId ? "selected" : ""} ${matched.has(word.lexemeId) ? "matched" : ""} ${mismatch.has(word.lexemeId) ? "mismatch" : ""}`}
              onClick={() => chooseLeft(word)}
            >
              {matched.has(word.lexemeId) ? <Check size={18} /> : null}<span>{word.arabic}</span>
            </button>
          ))}
        </div>
        <div className="match-column">
          {english.map((word) => (
            <button
              type="button"
              disabled={matched.has(word.lexemeId)}
              aria-pressed={right?.lexemeId === word.lexemeId}
              key={word.lexemeId}
              className={`match-chip ${right?.lexemeId === word.lexemeId ? "selected" : ""} ${matched.has(word.lexemeId) ? "matched" : ""} ${mismatch.has(word.lexemeId) ? "mismatch" : ""}`}
              onClick={() => chooseRight(word)}
            >
              {matched.has(word.lexemeId) ? <Check size={18} /> : null}<span>{word.english}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="match-progress">
        <div className="progress-track"><span style={{ width: `${(matched.size / words.length) * 100}%` }} /></div>
        <span>{words.length - matched.size} remaining</span>
      </div>
    </div>
  );
}

export default function ExerciseSession({
  words,
  unitNumber,
  lesson,
  lessonCount,
  distractorWords,
  mode = "lesson",
  requiresReview = false,
  scopeLabel,
  doneHref = "/repeat",
  doneLabel = "Back to repeat"
}: {
  words: CourseWord[];
  unitNumber: number;
  lesson: number;
  lessonCount: number;
  distractorWords?: CourseWord[];
  mode?: "lesson" | "repeat" | "checkpoint";
  requiresReview?: boolean;
  scopeLabel?: string;
  doneHref?: string;
  doneLabel?: string;
}) {
  const [stage, setStage] = useState<"learn" | "match" | "quiz" | "done">("learn");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<null | { correct: boolean; expected: string }>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [matchingScore, setMatchingScore] = useState(0);
  const [saving, setSaving] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [saveError, setSaveError] = useState("");
  const pendingAttempts = useRef<AttemptInput[]>([]);
  const finishing = useRef(false);
  const startedAt = useRef(Date.now());
  const router = useRouter();

  const questions = useMemo<Question[]>(() => seededShuffle(words.flatMap((word) => [
    { type: "ARABIC_TO_ENGLISH" as const, word },
    { type: "ENGLISH_TO_ARABIC" as const, word },
    { type: "CONTEXT" as const, word }
  ]), unitNumber * 1000 + lesson), [words, unitNumber, lesson]);
  const isRepeat = mode === "repeat";
  const isCheckpoint = mode === "checkpoint";
  const isReviewRound = isRepeat || isCheckpoint;
  const lessonPassed = Math.round(((correctCount + matchingScore) / (questions.length + words.length)) * 100) >= 60;
  const nextLessonHref = lesson < lessonCount ? `/learn/14/${unitNumber}?lesson=${lesson + 1}` : unitNumber < 20 ? `/learn/14/${unitNumber + 1}` : "/review";
  const checkpointHref = `/repeat?scope=checkpoint&unit=${unitNumber}&lesson=${lesson}`;

  useEffect(() => {
    if (stage !== "done" || !lessonPassed || isRepeat) return;
    router.prefetch(isCheckpoint ? doneHref : requiresReview ? checkpointHref : nextLessonHref);
  }, [checkpointHref, doneHref, isCheckpoint, isRepeat, lessonPassed, nextLessonHref, requiresReview, router, stage]);

  if (!words.length) {
    return <div className="empty-state"><h2>No vocabulary imported yet.</h2><p>Add Quran Foundation credentials, run the Juz 14 import, then return here.</p><code>npm run data:import:juz14</code></div>;
  }

  if (stage === "learn") {
    return (
      <div className="lesson-stack">
        <div className="lesson-progress"><span>{isReviewRound ? (scopeLabel ?? "Repeat round") : `Lesson ${lesson} of ${lessonCount}`}</span><span>{words.length} core words</span></div>
        <div className="learn-grid">
          {words.map((word) => (
            <article className="vocab-card" key={word.lexemeId}>
              <span className="verse-tag">Ayah {word.verseKey}</span>
              <div className="arabic-word" lang="ar" dir="rtl">{word.arabic}</div>
              <div className="meaning-row">
                <strong className="meaning">{word.english}</strong>
                <div className="word-audio-actions">
                  <button type="button" className="audio-button" aria-label={`Hear English pronunciation for ${word.english}`} title="Hear English pronunciation" onClick={() => speakEnglish(word.english)}><Volume2 size={18} /></button>
                  {word.audioUrl ? <button type="button" className="audio-button audio-button-secondary" aria-label={`Play Qur'an recitation for ${word.arabic}`} title="Play Qur'an recitation" onClick={() => { const url = wordAudioUrl(word.audioUrl); if (url) void new Audio(url).play(); }}><Volume2 size={17} /></button> : null}
                </div>
              </div>
              {word.indonesian ? <span className="helper">Indonesian <span aria-hidden="true">&middot;</span> {word.indonesian}</span> : null}
              <div className="word-meta">
                {word.root ? <span>Root <span aria-hidden="true">&middot;</span> {word.root}</span> : null}
                {word.partOfSpeech ? <span>{word.partOfSpeech}</span> : null}
                {word.masteryLevel !== "NEW" ? <span>{word.masteryLevel.toLowerCase()}</span> : null}
              </div>
            </article>
          ))}
        </div>
        <button type="button" className="button button-primary button-wide lesson-continue" onClick={() => setStage("match")}>{isCheckpoint ? "Start required review" : isRepeat ? "Start repeat round" : "Start matching"} <ArrowRight size={19} /></button>
      </div>
    );
  }

  if (stage === "match") {
    return <MatchingRound words={words} onAttempt={trackAttempt} onDone={(score) => { setMatchingScore(score); setStage("quiz"); startedAt.current = Date.now(); }} />;
  }

  if (stage === "done") {
    const total = questions.length + words.length;
    const correct = correctCount + matchingScore;
    const accuracy = Math.round((correct / total) * 100);
    const stars = accuracy >= 90 ? 3 : accuracy >= 75 ? 2 : accuracy >= 60 ? 1 : 0;
    return (
      <div className="result-card">
        <div className={`result-icon ${accuracy < 75 ? "retry" : ""}`}>{accuracy >= 75 ? <Check size={34} /> : <RotateCcw size={30} />}</div>
        <div className="kicker">{isCheckpoint ? (lessonPassed ? "Required review complete" : "Review again") : isRepeat ? "Repeat complete" : lessonPassed ? "Lesson complete" : "More practice needed"}</div>
        <h2>{accuracy}% accuracy</h2>
        <div className="result-stars" aria-label={`${stars} of 3 stars`}>{[1, 2, 3].map((value) => <Star key={value} size={28} fill={value <= stars ? "currentColor" : "none"} />)}</div>
        <p>{correct} of {total} interactions correct. {isCheckpoint ? (lessonPassed ? "The next lesson is now unlocked." : "Reach 60% to unlock the next lesson.") : isRepeat ? "This round updated your recall history and review schedule." : requiresReview && lessonPassed ? "Review every word once more to unlock the next lesson." : "Every word is now in your spaced-review schedule."}</p>
        <div className="toolbar centered">
          {isCheckpoint && lessonPassed ? (
            <Link className="button button-primary" href={doneHref}>{doneLabel} <ArrowRight size={18} /></Link>
          ) : isCheckpoint ? (
            <button type="button" className="button button-primary" onClick={resetSession}><RotateCcw size={18} /> Try review again</button>
          ) : isRepeat ? (
            <Link className="button button-primary" href={doneHref}>{doneLabel} <ArrowRight size={18} /></Link>
          ) : lessonPassed ? (
            <Link
              className={`button button-primary ${navigating ? "is-loading" : ""}`}
              href={requiresReview ? checkpointHref : nextLessonHref}
              aria-disabled={navigating}
              onClick={(event) => {
                if (navigating) {
                  event.preventDefault();
                  return;
                }
                setNavigating(true);
              }}
            >
              {navigating ? (requiresReview ? "Opening review..." : "Opening lesson...") : requiresReview ? "Review all words" : lesson < lessonCount ? "Next lesson" : unitNumber < 20 ? "Next unit" : "Start review"}
              {!navigating ? <ArrowRight size={18} /> : null}
            </Link>
          ) : (
            <button type="button" className="button button-primary" onClick={resetSession}><RotateCcw size={18} /> Try lesson again</button>
          )}
          {!isRepeat ? <Link className="button button-secondary" href={`/learn/14/${unitNumber}`} prefetch={false}>All lessons</Link> : null}
          <Link className="button button-secondary" href="/" prefetch={false}>Dashboard</Link>
        </div>
      </div>
    );
  }

  const question = questions[questionIndex];
  const direction = question.type === "ENGLISH_TO_ARABIC" ? "ar" : "en";
  const options = optionsFor(question.word, distractorWords?.length ? distractorWords : words, direction);
  const prompt = question.type === "ENGLISH_TO_ARABIC" ? question.word.english : question.word.arabic;

  function trackAttempt(word: CourseWord, type: string, correct: boolean, response: string, responseTimeMs: number) {
    pendingAttempts.current.push({
      lexemeId: word.lexemeId,
      occurrenceId: word.occurrenceId,
      exerciseType: type,
      correct,
      response,
      responseTimeMs
    });
  }

  function evaluate(response: string) {
    if (feedback) return;
    let correct = false;
    if (question.type === "ENGLISH_TO_ARABIC") {
      correct = normalizeArabic(response) === normalizeArabic(question.word.arabic);
    } else {
      const accepted = question.word.alternatives.length ? question.word.alternatives : [question.word.english];
      correct = accepted.map(normalizeEnglish).includes(normalizeEnglish(response));
    }
    const expected = question.type === "ENGLISH_TO_ARABIC" ? question.word.arabic : question.word.english;
    setFeedback({ correct, expected });
    if (correct) setCorrectCount((count) => count + 1);
    trackAttempt(question.word, question.type, correct, response, Date.now() - startedAt.current);
  }

  async function next() {
    if (saving || finishing.current) return;
    if (questionIndex + 1 < questions.length) {
      setAnswer("");
      setFeedback(null);
      setSaveError("");
      startedAt.current = Date.now();
      setQuestionIndex((index) => index + 1);
      return;
    }
    const total = questions.length + words.length;
    const correct = correctCount + matchingScore;
    finishing.current = true;
    setSaving(true);
    setSaveError("");
    try {
      const attempts = [...pendingAttempts.current];
      await saveAttempts(attempts);
      if (isCheckpoint && lessonPassed) {
        const result = await fetch("/api/progress/lesson-review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ unitNumber, correct, total, lesson, lessonCount })
        });
        if (!result.ok) throw new Error("Required review could not be saved.");
      } else if (!isReviewRound) {
        const result = await fetch("/api/progress/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ unitNumber, correct, total, lesson, lessonCount })
        });
        if (!result.ok) throw new Error("Lesson progress could not be saved.");
      }
      announceProgressUpdated();
      setAnswer("");
      setFeedback(null);
      setStage("done");
    } catch {
      setSaveError(isCheckpoint ? "Required review could not be saved. Check your connection and press Finish again." : isRepeat ? "Repeat attempts could not be saved. Check your connection and press Finish again." : "Progress could not be saved. Check your connection and press Finish again.");
    } finally {
      finishing.current = false;
      setSaving(false);
    }
  }

  function resetSession() {
    setQuestionIndex(0);
    setAnswer("");
    setFeedback(null);
    setCorrectCount(0);
    setMatchingScore(0);
    setSaveError("");
    pendingAttempts.current = [];
    startedAt.current = Date.now();
    setStage("learn");
  }

  const questionLabel = question.type === "ENGLISH_TO_ARABIC" ? "Choose the Qur'anic Arabic"
    : question.type === "CONTEXT" ? "What does this word mean in this ayah?"
    : "Choose the best English meaning";

  return (
    <div className="exercise-card quiz-card">
      <div className="quiz-status"><span>{question.type.replaceAll("_", " ")}</span><strong>{questionIndex + 1} / {questions.length}</strong></div>
      <div className="quiz-progress" role="progressbar" aria-label="Lesson question progress" aria-valuemin={1} aria-valuemax={questions.length} aria-valuenow={questionIndex + 1}><span style={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }} /></div>
      {question.type === "CONTEXT" && question.word.contextArabic ? (
        <div className="context-box"><span>Ayah {question.word.verseKey}</span><div className="arabic context-arabic" lang="ar" dir="rtl">{question.word.contextArabic}</div></div>
      ) : null}
      <p className="question-label">{questionLabel}</p>
      <div lang={question.type === "ENGLISH_TO_ARABIC" ? "en" : "ar"} dir={question.type === "ENGLISH_TO_ARABIC" ? "ltr" : "rtl"} className={question.type === "ENGLISH_TO_ARABIC" ? "prompt-english" : "prompt-arabic"}>{prompt}</div>

      <div className="choice-grid">
        {options.map((option, optionIndex) => {
          const selected = answer === option;
          const expected = feedback?.expected === option;
          const state = feedback ? (expected ? "correct-choice" : selected ? "wrong-choice" : "") : selected ? "selected-choice" : "";
          return (
            <button type="button" disabled={Boolean(feedback)} key={option} className={`choice ${question.type === "ENGLISH_TO_ARABIC" ? "arabic-choice" : ""} ${state}`} onClick={() => { setAnswer(option); evaluate(option); }}>
              <span className="choice-key">{optionIndex + 1}</span><span>{option}</span>
              {feedback && expected ? <Check className="choice-result-icon" size={19} /> : feedback && selected ? <X className="choice-result-icon" size={19} /> : null}
            </button>
          );
        })}
      </div>

      {saveError ? <div className="notice" role="alert">{saveError}</div> : null}

      {feedback ? (
        <div className={`feedback ${feedback.correct ? "feedback-good" : "feedback-bad"}`} role="status" aria-live="polite">
          <span className="feedback-icon" aria-hidden="true">{feedback.correct ? <Check size={22} /> : <X size={22} />}</span>
          <div><strong>{feedback.correct ? "Correct" : "Not quite"}</strong><span>Correct answer: {feedback.expected}</span>{question.word.indonesian ? <span className="helper">Indonesian <span aria-hidden="true">&middot;</span> {question.word.indonesian}</span> : null}</div>
          <button type="button" className="button button-primary feedback-next" disabled={saving} onClick={() => void next()}>{saving ? "Saving progress..." : questionIndex + 1 === questions.length ? "Finish" : "Next"}{!saving ? <ArrowRight size={18} /> : null}</button>
        </div>
      ) : null}
    </div>
  );
}
