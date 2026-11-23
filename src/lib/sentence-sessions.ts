import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureLearner, nextStreak } from "@/lib/learner";
import { nextReview } from "@/lib/srs";
import { masteryFromProgress } from "@/lib/mastery";
import { missingPhrase, publicQuestion, sentenceScheduleApplies, shuffled, translationMatches, type SentenceMode, type SentenceQuestion } from "@/lib/sentence-quiz";

export class SentenceError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
const segmentInclude = {
  page: true, verse: true,
  words: { include: { occurrence: { include: { lexeme: { select: { root: true, partOfSpeech: true } } } } } }
} satisfies Prisma.SentenceSegmentInclude;
type Segment = Prisma.SentenceSegmentGetPayload<{ include: typeof segmentInclude }>;
function planFromJson(value: Prisma.JsonValue): SentenceQuestion[] { return value as unknown as SentenceQuestion[]; }

export async function createSentenceSession(learnerId: string, input: { requestId: string; mode: SentenceMode; page?: number; segmentId?: string; scope: "page" | "due" | "weak"; retrySessionId?: string }) {
  await ensureLearner(learnerId);
  const duplicate = await prisma.sentenceQuizSession.findUnique({ where: { requestId: input.requestId } });
  if (duplicate) {
    if (duplicate.learnerId !== learnerId) throw new SentenceError("Session not found.", 404);
    return { id: duplicate.id };
  }
  let retryIds: string[] | undefined;
  if (input.retrySessionId) {
    const session = await prisma.sentenceQuizSession.findFirst({ where: { id: input.retrySessionId, learnerId, status: "COMPLETED" }, include: { attempts: { where: { correct: false }, select: { segmentId: true } } } });
    if (!session) throw new SentenceError("Completed session not found.", 404);
    retryIds = [...new Set(session.attempts.map((attempt) => attempt.segmentId))];
    if (!retryIds.length) throw new SentenceError("This session has no incorrect answers to retry.");
  }
  if (input.scope === "page" && !input.page && !input.segmentId && !retryIds) throw new SentenceError("Choose a Mushaf page or sentence.");
  const progressFilter: Prisma.SentenceProgressWhereInput = input.scope === "due"
    ? { learnerId, nextReviewAt: { lte: new Date() } }
    : { learnerId, OR: [{ wrongCount: { gt: 0 }, masteryLevel: { in: ["NEW", "LEARNING"] } }, { nextReviewAt: { lte: new Date() } }] };
  const segments = await prisma.sentenceSegment.findMany({
    where: {
      curationStatus: "READY", englishTranslation: { not: null }, page: { juzId: 14, mushafPage: input.page ?? { gte: 262, lte: 281 } },
      ...(input.segmentId ? { id: input.segmentId } : retryIds ? { id: { in: retryIds } } : {}),
      ...(input.scope === "page" ? {} : { progresses: { some: progressFilter } })
    }, include: segmentInclude, orderBy: [{ page: { mushafPage: "asc" } }, { segmentOrder: "asc" }], take: 100
  });
  if (!segments.length) throw new SentenceError("No curated sentences are available for this selection.");
  const pool = await prisma.sentenceSegment.findMany({ where: { curationStatus: "READY", englishTranslation: { not: null }, verse: { surah: { in: [...new Set(segments.map((item) => item.verse.surah))] } } }, include: segmentInclude, take: 300, orderBy: { segmentOrder: "asc" } });
  const plan: SentenceQuestion[] = [];
  const masteredBefore = new Set((await prisma.sentenceProgress.findMany({ where: { learnerId, segmentId: { in: segments.map((segment) => segment.id) }, masteryLevel: "MASTERED" }, select: { segmentId: true } })).map((progress) => progress.segmentId));
  for (const segment of shuffled(segments)) {
    if (input.mode === "LISTENING" && (!segment.audioVerified || !segment.audioUrl)) throw new SentenceError("Listening is pending verified audio alignment for this selection.");
    const phrase = missingPhrase(segment.englishTranslation!);
    if (input.mode === "MISSING_PHRASE" && !phrase) throw new SentenceError("A sentence is too short for Missing Phrase. Choose another mode or sentence.");
    const expected = input.mode === "ENGLISH_TO_ARABIC" ? segment.arabicText : input.mode === "MISSING_PHRASE" ? phrase!.expected : segment.englishTranslation!;
    const candidates = pool.filter((candidate) => candidate.id !== segment.id && candidate.verse.surah === segment.verse.surah)
      .map((candidate) => ({ candidate, rank: Math.abs(candidate.verse.ayahNumber - segment.verse.ayahNumber) + Math.abs(candidate.arabicText.length - segment.arabicText.length) / 40 }))
      .sort((a, b) => a.rank - b.rank).map(({ candidate }) => candidate);
    const choice = (candidate: Segment) => input.mode === "ENGLISH_TO_ARABIC" ? candidate.arabicText : input.mode === "MISSING_PHRASE" ? missingPhrase(candidate.englishTranslation!)?.expected : candidate.englishTranslation;
    const distractors = [...new Set(candidates.map(choice).filter((text): text is string => Boolean(text) && text !== expected))].slice(0, 3);
    if (input.mode !== "TYPING" && distractors.length < 3) throw new SentenceError("Four distinct, related options are not available yet. Import more curated material or use Typing Translation.");
    plan.push({
      key: segment.id, segmentId: segment.id, page: segment.page.mushafPage, reference: `${segment.verse.surah}:${segment.verse.ayahNumber}`, arabic: segment.arabicText,
      wasMastered: masteredBefore.has(segment.id),
      english: segment.englishTranslation!, expected, accepted: input.mode === "TYPING" && Array.isArray(segment.acceptedAnswers) ? segment.acceptedAnswers.filter((answer): answer is string => typeof answer === "string") : [],
      options: input.mode === "TYPING" ? [] : shuffled([expected, ...distractors]), context: segment.verse.arabicText,
      previous: pool.find((candidate) => candidate.verse.surah === segment.verse.surah && candidate.verse.ayahNumber === segment.verse.ayahNumber - 1)?.verse.arabicText ?? null,
      following: pool.find((candidate) => candidate.verse.surah === segment.verse.surah && candidate.verse.ayahNumber === segment.verse.ayahNumber + 1)?.verse.arabicText ?? null,
      translationSource: segment.translationSource!, sourceUrl: segment.sourceUrl, explanation: segment.explanation ?? segment.contextNote,
      audioUrl: segment.audioVerified ? segment.audioUrl : null, phrasePrompt: input.mode === "MISSING_PHRASE" ? phrase!.prompt : null,
      words: segment.words.sort((a, b) => a.occurrence.wordPosition - b.occurrence.wordPosition).map(({ occurrence: word }) => ({ arabic: word.arabic, english: word.sourceEnglish, root: word.lexeme.root, morphology: word.lexeme.partOfSpeech }))
    });
  }
  if (input.mode === "MATCH") {
    for (let index = 0; index < plan.length; index += 3) {
      const group = plan.slice(index, index + 3);
      const options = shuffled([...new Set(group.map((question) => question.expected))]);
      for (const question of group) question.options = options;
    }
  }
  try {
    const session = await prisma.sentenceQuizSession.create({ data: { learnerId, requestId: input.requestId, mode: input.mode, questionPlan: plan as unknown as Prisma.InputJsonValue } });
    return { id: session.id };
  } catch (error) {
    if ((error as { code?: string }).code !== "P2002") throw error;
    const existing = await prisma.sentenceQuizSession.findUniqueOrThrow({ where: { requestId: input.requestId } });
    if (existing.learnerId !== learnerId) throw new SentenceError("Session not found.", 404);
    return { id: existing.id };
  }
}

export async function getSentenceSession(learnerId: string, id: string) {
  const session = await prisma.sentenceQuizSession.findFirst({ where: { id, learnerId }, include: { attempts: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] } } });
  if (!session) throw new SentenceError("Session not found.", 404);
  const plan = planFromJson(session.questionPlan);
  const queue = plan.map((question) => question.key);
  for (const attempt of session.attempts) {
    const index = queue.indexOf(attempt.questionKey);
    if (index === -1) continue;
    queue.splice(index, 1);
    if (!attempt.correct) queue.push(attempt.questionKey);
  }
  const correct = session.attempts.filter((attempt) => attempt.correct).length;
  return {
    id: session.id, mode: session.mode as SentenceMode, status: session.status, result: session.result,
    queue, total: plan.length, attempts: session.attempts.length, correct, createdAt: session.createdAt.toISOString(),
    questions: plan.map((question) => ({ ...publicQuestion(question), ...(session.mode === "ENGLISH_TO_ARABIC" ? { englishPrompt: question.english } : {}) })),
    lastFeedback: session.attempts.length ? (() => {
      const last = session.attempts[session.attempts.length - 1];
      const question = plan.find((item) => item.key === last.questionKey)!;
      return { key: question.key, correct: last.correct, english: question.english, expected: question.expected, explanation: question.explanation };
    })() : null
  };
}

export async function answerSentence(learnerId: string, id: string, input: { attemptId: string; questionKey: string; response: string; responseTimeMs: number }) {
  return prisma.$transaction(async (tx) => {
    // Serialize writes per learner and session, including retries arriving after a timeout.
    await tx.$queryRaw`SELECT "id" FROM "Learner" WHERE "id" = ${learnerId} FOR UPDATE`;
    await tx.$queryRaw`SELECT "id" FROM "SentenceQuizSession" WHERE "id" = ${id} AND "learnerId" = ${learnerId} FOR UPDATE`;
    const session = await tx.sentenceQuizSession.findFirst({ where: { id, learnerId } });
    if (!session) throw new SentenceError("Session not found.", 404);
    const plan = planFromJson(session.questionPlan);
    const question = plan.find((item) => item.key === input.questionKey);
    if (!question) throw new SentenceError("Question does not belong to this session.");
    const duplicate = await tx.sentenceQuizAttempt.findUnique({ where: { id: input.attemptId } });
    if (duplicate) {
      if (duplicate.sessionId !== id || duplicate.learnerId !== learnerId || duplicate.questionKey !== input.questionKey || duplicate.response !== input.response) throw new SentenceError("Attempt identity conflicts with a saved answer.", 409);
      return { correct: duplicate.correct, english: question.english, expected: question.expected, explanation: question.explanation };
    }
    if (session.status !== "ACTIVE") throw new SentenceError("Session is already completed.", 409);
    const attempts = await tx.sentenceQuizAttempt.findMany({ where: { sessionId: id }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
    const mastered = new Set(attempts.filter((attempt) => attempt.correct).map((attempt) => attempt.questionKey));
    if (mastered.has(question.key)) throw new SentenceError("This question has already been mastered.", 409);
    if (session.mode !== "TYPING" && !question.options.includes(input.response)) throw new SentenceError("Choose an available answer.");
    const correct = translationMatches(input.response, question.expected, question.accepted);
    const previous = attempts.filter((attempt) => attempt.segmentId === question.segmentId);
    const progress = await tx.sentenceProgress.findUnique({ where: { learnerId_segmentId: { learnerId, segmentId: question.segmentId } } });
    const schedule = sentenceScheduleApplies(previous, correct, progress?.lastReviewedAt ?? null)
      ? nextReview({ quality: correct ? 4 : 1, intervalDays: progress?.intervalDays ?? 0, easeFactor: progress?.easeFactor ?? 2.5 })
      : { intervalDays: progress?.intervalDays ?? 0, easeFactor: progress?.easeFactor ?? 2.5, nextReviewAt: progress?.nextReviewAt ?? new Date(Date.now() + 600000) };
    const correctCount = (progress?.correctCount ?? 0) + Number(correct);
    const wrongCount = (progress?.wrongCount ?? 0) + Number(!correct);
    const streakCorrect = correct ? (progress?.streakCorrect ?? 0) + 1 : 0;
    const data = { correctCount, wrongCount, streakCorrect, ...schedule, masteryLevel: masteryFromProgress({ correctCount, wrongCount, streakCorrect, intervalDays: schedule.intervalDays }), lastReviewedAt: new Date(), completedAt: progress?.completedAt ?? (correct ? new Date() : null) };
    await tx.sentenceProgress.upsert({ where: { learnerId_segmentId: { learnerId, segmentId: question.segmentId } }, create: { learnerId, segmentId: question.segmentId, ...data }, update: data });
    const xpAwarded = previous.length === 0 ? correct ? 10 : 2 : 0;
    await tx.sentenceQuizAttempt.create({ data: { id: input.attemptId, learnerId, sessionId: id, segmentId: question.segmentId, questionKey: question.key, response: input.response, correct, responseTimeMs: input.responseTimeMs, xpAwarded } });
    const learner = await tx.learner.findUniqueOrThrow({ where: { id: learnerId } });
    await tx.learner.update({ where: { id: learnerId }, data: { xp: { increment: xpAwarded }, streakDays: nextStreak(learner.lastStudyDate, learner.streakDays), lastStudyDate: new Date() } });
    return { correct, english: question.english, expected: question.expected, explanation: question.explanation };
  }, { timeout: 20000 });
}

export async function finalizeSentenceSession(learnerId: string, id: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "SentenceQuizSession" WHERE "id" = ${id} AND "learnerId" = ${learnerId} FOR UPDATE`;
    const session = await tx.sentenceQuizSession.findFirst({ where: { id, learnerId }, include: { attempts: true } });
    if (!session) throw new SentenceError("Session not found.", 404);
    if (session.status === "COMPLETED") return session.result;
    const plan = planFromJson(session.questionPlan);
    const passed = new Set(session.attempts.filter((attempt) => attempt.correct).map((attempt) => attempt.questionKey));
    if (passed.size !== plan.length) throw new SentenceError("Recall every sentence correctly before finishing.", 409);
    const correct = session.attempts.filter((attempt) => attempt.correct).length;
    const weak = [...new Set(session.attempts.filter((attempt) => !attempt.correct).map((attempt) => attempt.segmentId))];
    const mastered = await tx.sentenceProgress.count({ where: { learnerId, segmentId: { in: plan.filter((item) => !item.wasMastered).map((item) => item.segmentId) }, masteryLevel: "MASTERED" } });
    const lastSegment = await tx.sentenceSegment.findUnique({ where: { id: plan[plan.length - 1].segmentId } });
    const nextSegment = lastSegment && plan.length === 1 ? await tx.sentenceSegment.findFirst({ where: { pageId: lastSegment.pageId, segmentOrder: { gt: lastSegment.segmentOrder }, curationStatus: "READY" }, orderBy: { segmentOrder: "asc" }, select: { id: true } }) : null;
    const result = { totalQuestions: plan.length, totalAttempts: session.attempts.length, correct, incorrect: session.attempts.length - correct, accuracy: Math.round(correct / session.attempts.length * 100), timeSpentSeconds: Math.round((Date.now() - session.createdAt.getTime()) / 1000), masteredSentences: mastered, weakSentences: plan.filter((item) => weak.includes(item.segmentId)).map((item) => ({ id: item.segmentId, reference: item.reference, arabic: item.arabic })), page: plan[0].page, nextSegmentId: nextSegment?.id ?? null };
    await tx.sentenceQuizSession.update({ where: { id }, data: { status: "COMPLETED", completedAt: new Date(), result } });
    return result;
  }, { timeout: 20000 });
}
