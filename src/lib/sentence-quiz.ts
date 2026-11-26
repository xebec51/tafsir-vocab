export const SENTENCE_MODES = ["ARABIC_TO_ENGLISH", "ENGLISH_TO_ARABIC", "MATCH", "CONTEXT", "MISSING_PHRASE", "TYPING", "LISTENING"] as const;
export type SentenceMode = typeof SENTENCE_MODES[number];
export const MODE_LABELS: Record<SentenceMode, string> = {
  ARABIC_TO_ENGLISH: "Arabic to English", ENGLISH_TO_ARABIC: "English to Arabic",
  MATCH: "Sentence matching", CONTEXT: "Context translation", MISSING_PHRASE: "Missing phrase",
  TYPING: "Typing translation", LISTENING: "Listening"
};
export type SentenceQuestion = {
  key: string; segmentId: string; page: number; reference: string; arabic: string;
  english: string; options: string[]; expected: string; accepted: string[];
  context: string; previous: string | null; following: string | null;
  translationSource: string; sourceUrl: string | null; explanation: string | null;
  audioUrl: string | null; phrasePrompt: string | null;
  words: Array<{ arabic: string; english: string | null; root: string | null; morphology: string | null; audioUrl?: string | null }>;
  wasMastered?: boolean;
};
export type PublicSentenceQuestion = Omit<SentenceQuestion, "english" | "expected" | "accepted" | "explanation"> & { englishPrompt?: string };
export function sentenceSessionProgress(keys: string[], attempts: Array<{ questionKey: string; correct: boolean }>) {
  const queue = [...keys];
  for (const attempt of attempts) {
    const index = queue.indexOf(attempt.questionKey);
    if (index === -1) continue;
    queue.splice(index, 1);
    if (!attempt.correct) queue.push(attempt.questionKey);
  }
  return { queue, total: keys.length, attempts: attempts.length, correct: attempts.filter((attempt) => attempt.correct).length };
}
export function normalizeTranslation(value: string) {
  return value.normalize("NFKC").toLowerCase().replace(/[\p{P}\p{S}]/gu, " ").replace(/\s+/g, " ").trim();
}
export function translationMatches(response: string, expected: string, accepted: string[] = []) {
  const normalized = normalizeTranslation(response);
  return normalized.length > 0 && [expected, ...accepted].some((value) => normalizeTranslation(value) === normalized);
}
export function shuffled<T>(input: readonly T[], random = Math.random): T[] {
  const items = [...input];
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
export function missingPhrase(translation: string) {
  const words = translation.trim().split(/\s+/);
  if (words.length < 4) return null;
  const start = Math.floor(words.length / 3);
  const end = Math.min(words.length, start + Math.max(1, Math.min(4, Math.floor(words.length / 3))));
  return { prompt: [...words.slice(0, start), "_____", ...words.slice(end)].join(" "), expected: words.slice(start, end).join(" ") };
}
export function publicQuestion(question: SentenceQuestion): PublicSentenceQuestion {
  const { english: _english, expected: _expected, accepted: _accepted, explanation: _explanation, ...safe } = question;
  return safe;
}
export function sentenceScheduleApplies(previous: Array<{ correct: boolean }>, correct: boolean, lastReviewedAt: Date | null, now = new Date()) {
  if (!correct) return !previous.some((attempt) => !attempt.correct);
  return previous.length === 0 && (!lastReviewedAt || now.getTime() - lastReviewedAt.getTime() >= 10 * 60 * 1000);
}
export function sentenceStatus(progress: { correctCount: number; wrongCount: number; completedAt: Date | null; nextReviewAt: Date | null } | undefined, now = new Date()) {
  if (!progress) return "Not Started";
  if ((progress.wrongCount > 0 && progress.correctCount / (progress.correctCount + progress.wrongCount) < 0.8) || (progress.nextReviewAt && progress.nextReviewAt <= now)) return "Needs Review";
  return progress.completedAt ? "Completed" : "In Progress";
}
