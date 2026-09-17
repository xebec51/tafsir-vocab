"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { CourseWord } from "@/lib/course";
import { normalizeArabic } from "@/lib/arabic";
import { wordAudioUrl } from "@/lib/audio";

type QuestionType = "ARABIC_TO_ENGLISH" | "ENGLISH_TO_ARABIC" | "CONTEXT" | "TYPING_RECALL" | "LISTENING";
type Question = { type: QuestionType; word: CourseWord };

function normalizeEnglish(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(the|a|an|to)\s+/, "");
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
    .filter((x) => x.lexemeId !== word.lexemeId)
    .map((x) => direction === "en" ? x.english : x.arabic)
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
  function resolve(a: CourseWord, b: CourseWord) {
    if (a.lexemeId === b.lexemeId) {
      const next = new Set(matched).add(a.lexemeId);
      setMatched(next);
      void saveAttempt(a, "MATCH", true, b.english, 0);
      setLeft(null); setRight(null);
      if (next.size === words.length) setTimeout(() => onDone(Math.max(0, words.length - mistakes)), 250);
    } else {
      setMistakes((m) => m + 1);
      void saveAttempt(a, "MATCH", false, b.english, 0);
      setTimeout(() => { setLeft(null); setRight(null); }, 300);
    }
  }

  return (
    <div className="exercise-card">
      <div className="exercise-kicker">Warm-up · Matching</div>
      <h2>Match Arabic with English</h2>
      <p className="muted">Build the direct Arabic → English connection before recall.</p>
      <div className="match-grid">
        <div className="match-column">
          {words.map((word) => <button key={word.lexemeId} className={`match-chip arabic-small ${left?.lexemeId === word.lexemeId ? "selected" : ""} ${matched.has(word.lexemeId) ? "matched" : ""}`} onClick={() => chooseLeft(word)}>{word.arabic}</button>)}
        </div>
        <div className="match-column">
          {english.map((word) => <button key={word.lexemeId} className={`match-chip ${right?.lexemeId === word.lexemeId ? "selected" : ""} ${matched.has(word.lexemeId) ? "matched" : ""}`} onClick={() => chooseRight(word)}>{word.english}</button>)}
        </div>
      </div>
      <div className="progress-caption">{matched.size}/{words.length} matched</div>
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
        <div className="lesson-progress"><span>Lesson {lesson}/{lessonCount}</span><span>{words.length} core words</span></div>
        <div className="learn-grid">
          {words.map((word) => (
            <article className="vocab-card" key={word.lexemeId}>
              <span className="verse-tag">{word.verseKey}</span>
              <div className="arabic-word">{word.arabic}</div>
              <div className="meaning-row"><strong className="meaning">{word.english}</strong>{word.audioUrl ? <button className="audio-button" aria-label="Play word pronunciation" onClick={() => { const url = wordAudioUrl(word.audioUrl); if (url) void new Audio(url).play(); }}>▶</button> : null}</div>
              {word.indonesian ? <span className="helper">ID · {word.indonesian}</span> : null}
              <div className="word-meta">
                {word.root ? <span>Root · {word.root}</span> : null}
                {word.partOfSpeech ? <span>{word.partOfSpeech}</span> : null}
                {word.masteryLevel !== "NEW" ? <span>{word.masteryLevel}</span> : null}
              </div>
            </article>
          ))}
        </div>
        <button className="button button-primary button-wide" onClick={() => setStage("match")}>I&apos;ve reviewed these words →</button>
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
        <div className="result-icon">{accuracy >= 75 ? "✓" : "↻"}</div>
        <div className="kicker">Lesson complete</div>
        <h2>{accuracy}% accuracy</h2>
        <div className="result-stars">{"★".repeat(stars)}{"☆".repeat(3 - stars)}</div>
        <p>{correct} of {total} interactions correct. Every word has now entered your spaced-review schedule.</p>
        <div className="toolbar centered">
          <Link className="button button-primary" href={nextLesson}>Continue →</Link>
          <Link className="button button-secondary" href="/">Dashboard</Link>
        </div>
      </div>
    );
  }

  const question = questions[questionIndex];
  const isChoice = question.type !== "TYPING_RECALL";
  const direction = question.type === "ENGLISH_TO_ARABIC" ? "ar" : "en";
  const options = isChoice ? optionsFor(question.word, distractorWords?.length ? distractorWords : words, direction) : [];
  const prompt = question.type === "ENGLISH_TO_ARABIC"
    ? question.word.english
    : question.word.arabic;

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
    if (correct) setCorrectCount((c) => c + 1);
    void saveAttempt(question.word, question.type, correct, response, Date.now() - startedAt.current);
  }

  async function next() {
    setAnswer(""); setFeedback(null); startedAt.current = Date.now();
    if (questionIndex + 1 < questions.length) {
      setQuestionIndex((i) => i + 1);
      return;
    }
    const total = questions.length + words.length;
    const correct = correctCount + matchingScore;
    await fetch("/api/progress/session", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ unitNumber, correct, total, lesson, lessonCount })
    });
    setStage("done");
  }

  return (
    <div className="exercise-card">
      <div className="quiz-progress"><span style={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }} /></div>
      <div className="exercise-kicker">{question.type.replaceAll("_", " ")} · {questionIndex + 1}/{questions.length}</div>
      {question.type === "CONTEXT" && question.word.contextArabic ? (
        <div className="context-box"><span>{question.word.verseKey}</span><div className="arabic context-arabic">{question.word.contextArabic}</div></div>
      ) : null}
      <p className="question-label">{question.type === "ENGLISH_TO_ARABIC" ? "Choose the Qur'anic Arabic" : question.type === "TYPING_RECALL" ? "Type the English meaning from memory" : question.type === "CONTEXT" ? "What does this word mean in this ayah?" : question.type === "LISTENING" ? "Listen, then choose the English meaning" : "Choose the best English meaning"}</p>
      {question.type === "LISTENING" ? (
        <div className="listening-prompt"><button className="listen-big" onClick={() => { const url = wordAudioUrl(question.word.audioUrl); if (url) void new Audio(url).play(); }}>▶<span>Play word</span></button></div>
      ) : <div className={question.type === "ENGLISH_TO_ARABIC" ? "prompt-english" : "prompt-arabic"}>{prompt}</div>}

      {isChoice ? (
        <div className="choice-grid">
          {options.map((option) => <button disabled={Boolean(feedback)} key={option} className={`choice ${question.type === "ENGLISH_TO_ARABIC" ? "arabic-choice" : ""}`} onClick={() => { setAnswer(option); evaluate(option); }}>{option}</button>)}
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); evaluate(answer); }} className="typing-row">
          <input autoFocus disabled={Boolean(feedback)} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Type the meaning…" />
          <button className="button button-primary" disabled={!answer.trim() || Boolean(feedback)}>Check</button>
        </form>
      )}

      {feedback ? (
        <div className={`feedback ${feedback.correct ? "feedback-good" : "feedback-bad"}`}>
          <div><strong>{feedback.correct ? "Correct" : "Not quite"}</strong><span>Answer: {feedback.expected}</span>{question.word.indonesian ? <span className="helper">ID · {question.word.indonesian}</span> : null}</div>
          <button className="button button-primary" onClick={() => void next()}>{questionIndex + 1 === questions.length ? "Finish" : "Next"}</button>
        </div>
      ) : null}
    </div>
  );
}
