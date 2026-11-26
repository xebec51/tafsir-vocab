"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRight, Check, RotateCcw, X } from "lucide-react";
import type { getSentenceSession } from "@/lib/sentence-sessions";
import { MODE_LABELS, type PublicSentenceQuestion } from "@/lib/sentence-quiz";
import SentencePracticeLauncher from "@/components/SentencePracticeLauncher";
import { announceProgressUpdated } from "@/lib/progress-client";
import PronunciationAudio, { EnglishPronunciation } from "@/components/PronunciationAudio";

type Session = Awaited<ReturnType<typeof getSentenceSession>>;
type Feedback = { correct: boolean; expected: string; english: string; explanation: string | null; question: PublicSentenceQuestion };
type Result = { totalQuestions: number; totalAttempts: number; correct: number; incorrect: number; accuracy: number; timeSpentSeconds: number; masteredSentences: number; weakSentences: Array<{ id: string; reference: string; arabic: string }>; page: number; nextSegmentId?: string | null; nextListening?: boolean };

export default function SentenceQuizSession({ initial }: { initial: Session }) {
  const [session, setSession] = useState(initial);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [selected, setSelected] = useState("");
  const [typed, setTyped] = useState("");
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const pending = useRef<{ attemptId: string; questionKey: string; response: string; responseTimeMs: number } | null>(null);
  const started = useRef(Date.now());
  const question = feedback?.question ?? session.questions.find((item) => item.key === session.queue[0]);
  const matching = session.mode === "MATCH";
  const activeGroup = matching ? Array.from({ length: Math.ceil(session.questions.length / 3) }, (_, index) => session.questions.slice(index * 3, index * 3 + 3)).find((group) => group.some((item) => session.queue.includes(item.key))) ?? [] : [];
  const currentMatch = activeGroup.find((item) => item.key === selectedMatch);
  const audioQuestion = feedback?.question ?? currentMatch ?? question;
  const answered = session.total - session.queue.length;
  const accuracy = session.attempts ? Math.round(session.correct / session.attempts * 100) : 0;

  function openSession(data: Session) {
    setSession(data); setFeedback(null); setSelected(""); setTyped(""); setSelectedMatch(null);
    setBusy(false); setError(""); lock.current = false; pending.current = null; started.current = Date.now();
    window.scrollTo({ top: 0, behavior: "auto" });
  }
  async function answer(response: string, target = question) {
    if (lock.current || feedback || !target) return;
    lock.current = true; setBusy(true); setError(""); setSelected(response);
    pending.current ??= { attemptId: crypto.randomUUID(), questionKey: target.key, response, responseTimeMs: Math.min(86400000, Date.now() - started.current) };
    try {
      const saved = await fetch(`/api/sentences/sessions/${session.id}/attempts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pending.current) });
      const data = await saved.json();
      if (!saved.ok) throw new Error(data.error || "Answer could not be saved.");
      if (!data.progress) throw new Error("Saved progress could not be loaded. Please retry.");
      setSession((current) => ({ ...current, ...data.progress }));
      setFeedback({ correct: data.correct, expected: data.expected, english: data.english, explanation: data.explanation, question: target });
      pending.current = null;
      announceProgressUpdated();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Connection failed. Retry this answer safely."); }
    finally { setBusy(false); lock.current = false; }
  }
  async function next() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError("");
    try {
      if (!session.queue.length) {
        const response = await fetch(`/api/sentences/sessions/${session.id}/finalize`, { method: "POST" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Session could not be finished. Please retry.");
        setSession((current) => ({ ...current, status: "COMPLETED", result }));
        announceProgressUpdated();
      }
      setFeedback(null); setTyped(""); setSelected(""); setSelectedMatch(null); started.current = Date.now();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Session could not be saved. Please retry."); }
    finally { setBusy(false); lock.current = false; }
  }
  if (session.status === "COMPLETED" && session.result) {
    const result = session.result as unknown as Result;
    return <div className="sentence-results"><section className="result-card"><div className="result-icon"><Check size={30} /></div><div className="kicker">Sentence practice complete</div><h1>{result.accuracy}% accuracy</h1><p>Every sentence was recalled correctly before finishing.</p><dl className="sentence-result-stats"><div><dt>Questions</dt><dd>{result.totalQuestions}</dd></div><div><dt>Correct answers</dt><dd>{result.correct}</dd></div><div><dt>Incorrect answers</dt><dd>{result.incorrect}</dd></div><div><dt>Time spent</dt><dd>{Math.floor(result.timeSpentSeconds / 60)}m {result.timeSpentSeconds % 60}s</dd></div><div><dt>Newly mastered</dt><dd>{result.masteredSentences}</dd></div><div><dt>Need review</dt><dd>{result.weakSentences.length}</dd></div></dl><div className="toolbar centered"><Link className="button button-primary" href={`/sentences/${result.page}`}>Back to page <ArrowRight size={16} /></Link><Link className="button button-secondary" href="/sentences/weak">Review weak sentences</Link></div></section>{result.weakSentences.length ? <section className="sentence-result-section"><h2>Strengthen these sentences</h2>{result.weakSentences.map((item) => <div key={item.id}><span className="verse-tag">Ayah {item.reference}</span><p className="arabic sentence-arabic" lang="ar" dir="rtl">{item.arabic}</p></div>)}<SentencePracticeLauncher retrySessionId={session.id} label="Retry incorrect answers" onStarted={openSession} /></section> : null}{result.nextSegmentId ? <section className="sentence-result-section"><h2>Continue your page</h2><SentencePracticeLauncher segmentId={result.nextSegmentId} label="Continue to next group" listening={result.nextListening} initialMode={session.mode} onStarted={openSession} prepare /></section> : null}</div>;
  }
  if (!question) return <div className="result-card"><h2>All sentences recalled</h2><p>Finish this session to save your complete result.</p><button type="button" className="button button-primary" disabled={busy} onClick={() => void next()}>{busy ? "Saving..." : "Finish session"}</button>{error ? <p role="alert" className="notice notice-error">{error}</p> : null}</div>;
  return <div className="exercise-card sentence-quiz">
    <div className="quiz-status"><span>{MODE_LABELS[session.mode]}</span><strong>{accuracy}% score <small>{answered} / {session.total} mastered</small></strong></div><div className="quiz-progress" role="progressbar" aria-label="Sentence mastery" aria-valuemin={0} aria-valuemax={session.total} aria-valuenow={answered}><span style={{ width: `${answered / session.total * 100}%` }} /></div>
    <div className="sentence-question-reference"><span className="verse-tag">Ayah {question.reference}</span><Link href={`/sentences/${question.page}`}>Mushaf page {question.page}</Link></div>
    {matching ? <>
      <p className="question-label">Match each Arabic sentence with its English translation.</p>
      {audioQuestion?.audioUrl ? <div className="sentence-recitation"><PronunciationAudio key={audioQuestion.key} src={audioQuestion.audioUrl} label={`Play Arabic sentence ${audioQuestion.reference}`} /><span>Ayah {audioQuestion.reference}</span></div> : null}
      <div className="sentence-match-grid"><div>{activeGroup.map((item) => <button type="button" key={item.key} disabled={busy || feedback !== null || !session.queue.includes(item.key)} className={`sentence-match-arabic ${selectedMatch === item.key ? "selected" : ""} ${!session.queue.includes(item.key) ? "matched" : ""}`} onClick={() => setSelectedMatch(item.key)} aria-pressed={selectedMatch === item.key}><span className="arabic" lang="ar" dir="rtl">{item.arabic}</span>{!session.queue.includes(item.key) ? <Check size={17} /> : null}</button>)}</div><div>{activeGroup[0]?.options.map((option) => <button type="button" key={option} disabled={!currentMatch || busy || feedback !== null} className="sentence-match-english" onClick={() => void answer(option, currentMatch)}>{option}</button>)}</div></div>
    </> : <>
      <p className="question-label">{session.mode === "ENGLISH_TO_ARABIC" ? "Choose the matching Arabic sentence." : session.mode === "MISSING_PHRASE" ? "Choose the missing phrase from the reference translation." : session.mode === "TYPING" ? "Write your English translation." : session.mode === "LISTENING" ? "Listen, then choose the matching translation." : session.mode === "CONTEXT" ? "Choose the translation that fits this verse context." : "Choose the most accurate English translation."}</p>
      {session.mode === "LISTENING" && question.audioUrl ? <PronunciationAudio key={question.key} src={question.audioUrl} label={`Recitation of ayah ${question.reference}`} native /> : session.mode === "ENGLISH_TO_ARABIC" ? <p className="sentence-english-prompt">{question.englishPrompt}{question.englishPrompt ? <EnglishPronunciation text={question.englishPrompt} /> : null}</p> : <p className="arabic sentence-arabic sentence-prompt" lang="ar" dir="rtl">{question.arabic}</p>}
      {session.mode !== "LISTENING" && question.audioUrl ? <div className="sentence-recitation"><PronunciationAudio key={question.key} src={question.audioUrl} label={`Play Arabic sentence ${question.reference}`} /><span>Listen to the sentence</span></div> : null}
      {session.mode === "MISSING_PHRASE" ? <p className="sentence-english-prompt">{question.phrasePrompt}</p> : null}
      {session.mode === "TYPING" ? <form className="sentence-typing" onSubmit={(event) => { event.preventDefault(); void answer(typed); }}><label htmlFor="sentence-translation-answer">Your translation</label><textarea id="sentence-translation-answer" value={typed} disabled={busy || feedback !== null || pending.current !== null} onChange={(event) => setTyped(event.target.value)} rows={4} maxLength={8000} spellCheck lang="en" /><p className="tiny">Study aid: compared with the reference and curated accepted answers. Other valid translations may need manual review.</p><button type="submit" className="button button-primary" disabled={!typed.trim() || busy || feedback !== null || pending.current !== null}>Check translation <Check size={17} /></button></form> : <div className="sentence-choice-grid">{question.options.map((option, index) => <button type="button" key={option} className={`choice sentence-choice ${session.mode === "ENGLISH_TO_ARABIC" ? "arabic-choice" : ""} ${feedback && option === feedback.expected ? "correct-choice" : feedback && option === selected ? "wrong-choice" : ""}`} disabled={busy || feedback !== null || pending.current !== null} onClick={() => void answer(option)}><span className="choice-key">{index + 1}</span><span lang={session.mode === "ENGLISH_TO_ARABIC" ? "ar" : "en"} dir={session.mode === "ENGLISH_TO_ARABIC" ? "rtl" : "ltr"}>{option}</span>{feedback && option === feedback.expected ? <Check size={17} /> : null}</button>)}</div>}
    </>}
    {feedback ? <div className={`feedback ${feedback.correct ? "feedback-good" : "feedback-bad"}`} role="status" aria-live="polite"><span className="feedback-icon">{feedback.correct ? <Check size={22} /> : <X size={22} />}</span><div><strong>{feedback.correct ? "Correct" : session.mode === "TYPING" ? "Compare with the reference" : "Review this sentence"}</strong><span>{feedback.english}</span>{!feedback.correct ? <span className="tiny">This sentence returns at the end of the queue.</span> : null}</div><button type="button" className="button button-primary feedback-next" disabled={busy} onClick={() => void next()}>{busy ? "Saving..." : session.queue.length ? "Next" : "Finish"}<ArrowRight size={17} /></button></div> : null}
    <div className="sentence-context-stack" key={question.key}>
      <details className="sentence-disclosure"><summary>Show verse context</summary><div>{question.previous ? <><span className="tiny">Previous ayah</span><p className="arabic sentence-arabic" lang="ar" dir="rtl">{question.previous}</p></> : null}<span className="tiny">Full ayah · {question.reference}</span><p className="arabic sentence-arabic" lang="ar" dir="rtl">{question.context}</p>{question.following ? <><span className="tiny">Following ayah</span><p className="arabic sentence-arabic" lang="ar" dir="rtl">{question.following}</p></> : null}{feedback ? <details><summary>Show translation</summary><p>{feedback.english}</p></details> : null}</div></details>
      <details className="sentence-disclosure"><summary>Show word breakdown</summary><div className="sentence-breakdown">{question.words.map((word, index) => <div key={index}><span className="arabic" lang="ar" dir="rtl">{word.arabic}</span><strong>{word.english ?? "—"}</strong><div className="sentence-word-audio">{word.audioUrl ? <PronunciationAudio src={word.audioUrl} label={`Play Arabic word ${index + 1}: ${word.arabic}`} /> : null}{word.english ? <EnglishPronunciation text={word.english} /> : null}</div><span className="tiny">{word.root ? `Root: ${word.root}` : ""}{word.morphology ? ` · ${word.morphology}` : ""}</span></div>)}</div></details>
      {feedback ? <details className="sentence-disclosure"><summary>Show translation explanation</summary><div><p>{feedback.english}</p><p className="muted">{feedback.explanation ?? "A detailed clause explanation is pending curation. Compare the reference translation with the full ayah and word breakdown."}</p><p className="tiny">{question.translationSource}{question.sourceUrl ? <> · <a href={question.sourceUrl} target="_blank" rel="noreferrer">Source</a></> : null}</p></div></details> : null}
    </div>
    {error ? <div className="notice notice-error" role="alert"><p>{error}</p>{pending.current ? <button type="button" className="button button-secondary" disabled={busy} onClick={() => { const attempt = pending.current; const target = session.questions.find((item) => item.key === attempt?.questionKey); if (attempt) void answer(attempt.response, target); }}><RotateCcw size={16} /> Retry saving answer</button> : null}</div> : null}
  </div>;
}
