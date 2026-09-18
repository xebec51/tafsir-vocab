"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { ArrowRight, Check, Headphones, RotateCcw, Star, Volume2, X } from "lucide-react";
import type { CourseWord } from "@/lib/course";
import { normalizeArabic } from "@/lib/arabic";
import { wordAudioUrl } from "@/lib/audio";

type QuestionType = "ARABIC_TO_ENGLISH" | "ENGLISH_TO_ARABIC" | "CONTEXT" | "TYPING_RECALL" | "LISTENING";
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

async function saveAttempt(word: CourseWord, type: string, correct: boolean, response: string, responseTimeMs: number) {
  await fetch("/api/progress/attempt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      lexemeId: word.lexemeId,
      occurrenceId: word.occurrenceId,
      exerciseType: type,
      correct,
      response,
      responseTimeMs
    })
  });
}

function MatchingRound({ words, onDone }: { words: CourseWord[]; onDone: (correct: number) => void }) {
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
      void saveAttempt(arabicWord, "MATCH", true, englishWord.english, 0);
      setLeft(null);
      setRight(null);
      if (next.size === words.length) setTimeout(() => onDone(Math.max(0, words.length - mistakes)), 350);
      return;
    }

    setMistakes((value) => value + 1);
    setMismatch(new Set([arabicWord.lexemeId, englishWord.lexemeId]));
    void saveAttempt(arabicWord, "MATCH", false, englishWord.english, 0);
    setTimeout(() => {
      setLeft(null);
      setRight(null);
      setMismatch(new Set());
    }, 450);
  }

  return (
    <div className="exercise-card matching-card">
      <div className="exercise-kicker">Warm-up <span aria-hidden="true">&middot;</span> Matching</div>
      <h2>Match Arabic with English</h2>
      <p className="muted">Select one card from each side. Matched pairs are marked automatically.</p>
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
        <span>{matched.size} of {words.length} matched</span>
      </div>
    </div>
  );
}

export default function ExerciseSession({
  words,
  unitNumber,
  lesson,
  lessonCount,
  distractorWords
}: {
  words: CourseWord[];
  unitNumber: number;
  lesson: number;
  lessonCount: number;
  distractorWords?: CourseWord[];
}) {
  const [stage, setStage] = useState<"learn" | "match" | "quiz" | "done">("learn");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<null | { correct: boolean; expected: string }>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [matchingScore, setMatchingScore] = useState(0);
  const startedAt = useRef(Date.now());

  const questions = useMemo<Question[]>(() => seededShuffle(words.flatMap((word) => [
    { type: "ARABIC_TO_ENGLISH" as const, word },
    { type: "ENGLISH_TO_ARABIC" as const, word },
    { type: "CONTEXT" as const, word },
    { type: "TYPING_RECALL" as const, word },
    ...(word.audioUrl ? [{ type: "LISTENING" as const, word }] : [])
  ]), unitNumber * 1000 + lesson), [words, unitNumber, lesson]);

  if (!words.length) {
    return <div className="empty-state"><h2>No vocabulary imported yet.</h2><p>Add Quran Foundation credentials, run the Juz 14 import, then return here.</p><code>npm run data:import:juz14</code></div>;
  }

  if (stage === "learn") {
    return (
      <div className="lesson-stack">
        <div className="lesson-progress"><span>Lesson {lesson} of {lessonCount}</span><span>{words.length} core words</span></div>
        <div className="learn-grid">
          {words.map((word) => (
            <article className="vocab-card" key={word.lexemeId}>
              <span className="verse-tag">Ayah {word.verseKey}</span>
              <div className="arabic-word" lang="ar" dir="rtl">{word.arabic}</div>
              <div className="meaning-row">
                <strong className="meaning">{word.english}</strong>
                {word.audioUrl ? <button type="button" className="audio-button" aria-label={`Play pronunciation for ${word.arabic}`} title="Play pronunciation" onClick={() => { const url = wordAudioUrl(word.audioUrl); if (url) void new Audio(url).play(); }}><Volume2 size={18} /></button> : null}
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
        <button type="button" className="button button-primary button-wide lesson-continue" onClick={() => setStage("match")}>Start matching <ArrowRight size={19} /></button>
      </div>
    );
  }

  if (stage === "match") {
    return <MatchingRound words={words} onDone={(score) => { setMatchingScore(score); setStage("quiz"); startedAt.current = Date.now(); }} />;
  }

  if (stage === "done") {
    const total = questions.length + words.length;
    const correct = correctCount + matchingScore;
    const accuracy = Math.round((correct / total) * 100);
    const stars = accuracy >= 90 ? 3 : accuracy >= 75 ? 2 : accuracy >= 60 ? 1 : 0;
    const nextLesson = lesson < lessonCount ? `/learn/14/${unitNumber}?lesson=${lesson + 1}` : unitNumber < 20 ? `/learn/14/${unitNumber + 1}` : "/review";
    return (
      <div className="result-card">
        <div className={`result-icon ${accuracy < 75 ? "retry" : ""}`}>{accuracy >= 75 ? <Check size={34} /> : <RotateCcw size={30} />}</div>
        <div className="kicker">Lesson complete</div>
        <h2>{accuracy}% accuracy</h2>
        <div className="result-stars" aria-label={`${stars} of 3 stars`}>{[1, 2, 3].map((value) => <Star key={value} size={28} fill={value <= stars ? "currentColor" : "none"} />)}</div>
        <p>{correct} of {total} interactions correct. Every word is now in your spaced-review schedule.</p>
        <div className="toolbar centered">
          <Link className="button button-primary" href={nextLesson}>Continue <ArrowRight size={18} /></Link>
          <Link className="button button-secondary" href="/">Dashboard</Link>
        </div>
      </div>
    );
  }

  const question = questions[questionIndex];
  const isChoice = question.type !== "TYPING_RECALL";
  const direction = question.type === "ENGLISH_TO_ARABIC" ? "ar" : "en";
  const options = isChoice ? optionsFor(question.word, distractorWords?.length ? distractorWords : words, direction) : [];
  const prompt = question.type === "ENGLISH_TO_ARABIC" ? question.word.english : question.word.arabic;

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
    void saveAttempt(question.word, question.type, correct, response, Date.now() - startedAt.current);
  }

  async function next() {
    setAnswer("");
    setFeedback(null);
    startedAt.current = Date.now();
    if (questionIndex + 1 < questions.length) {
      setQuestionIndex((index) => index + 1);
      return;
    }
    const total = questions.length + words.length;
    const correct = correctCount + matchingScore;
    await fetch("/api/progress/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unitNumber, correct, total, lesson, lessonCount })
    });
    setStage("done");
  }

  const questionLabel = question.type === "ENGLISH_TO_ARABIC" ? "Choose the Qur'anic Arabic"
    : question.type === "TYPING_RECALL" ? "Type the English meaning from memory"
    : question.type === "CONTEXT" ? "What does this word mean in this ayah?"
    : question.type === "LISTENING" ? "Listen, then choose the English meaning"
    : "Choose the best English meaning";

  return (
    <div className="exercise-card quiz-card">
      <div className="quiz-status"><span>{question.type.replaceAll("_", " ")}</span><strong>{questionIndex + 1} / {questions.length}</strong></div>
      <div className="quiz-progress" role="progressbar" aria-label="Lesson question progress" aria-valuemin={1} aria-valuemax={questions.length} aria-valuenow={questionIndex + 1}><span style={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }} /></div>
      {question.type === "CONTEXT" && question.word.contextArabic ? (
        <div className="context-box"><span>Ayah {question.word.verseKey}</span><div className="arabic context-arabic" lang="ar" dir="rtl">{question.word.contextArabic}</div></div>
      ) : null}
      <p className="question-label">{questionLabel}</p>
      {question.type === "LISTENING" ? (
        <div className="listening-prompt"><button type="button" className="listen-big" aria-label="Play Arabic word" onClick={() => { const url = wordAudioUrl(question.word.audioUrl); if (url) void new Audio(url).play(); }}><Headphones size={38} /><span>Play word</span></button></div>
      ) : <div lang={question.type === "ENGLISH_TO_ARABIC" ? "en" : "ar"} dir={question.type === "ENGLISH_TO_ARABIC" ? "ltr" : "rtl"} className={question.type === "ENGLISH_TO_ARABIC" ? "prompt-english" : "prompt-arabic"}>{prompt}</div>}

      {isChoice ? (
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
      ) : (
        <form onSubmit={(event) => { event.preventDefault(); evaluate(answer); }} className="typing-row">
          <input aria-label="English meaning" autoComplete="off" autoFocus disabled={Boolean(feedback)} value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Type the English meaning" />
          <button className="button button-primary" disabled={!answer.trim() || Boolean(feedback)}>Check answer</button>
        </form>
      )}

      {feedback ? (
        <div className={`feedback ${feedback.correct ? "feedback-good" : "feedback-bad"}`} role="status" aria-live="polite">
          <span className="feedback-icon" aria-hidden="true">{feedback.correct ? <Check size={22} /> : <X size={22} />}</span>
          <div><strong>{feedback.correct ? "Correct" : "Not quite"}</strong><span>Correct answer: {feedback.expected}</span>{question.word.indonesian ? <span className="helper">Indonesian <span aria-hidden="true">&middot;</span> {question.word.indonesian}</span> : null}</div>
          <button type="button" className="button button-primary feedback-next" onClick={() => void next()}>{questionIndex + 1 === questions.length ? "Finish" : "Next"}<ArrowRight size={18} /></button>
        </div>
      ) : null}
    </div>
  );
}
