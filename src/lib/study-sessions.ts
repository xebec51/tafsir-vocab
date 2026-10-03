import type { Prisma, WordProgress } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureLearner, nextStreak } from "@/lib/learner";
import { masteryFromProgress, starsForAccuracy } from "@/lib/mastery";
import { nextReview } from "@/lib/srs";
import { maxAccessibleLesson } from "@/lib/course";
import { normalizeArabic } from "@/lib/arabic";

export type StudyKind = "LESSON" | "CHECKPOINT" | "REPEAT" | "REVIEW" | "ALL" | "WEAK";
type QuestionType = "MATCH" | "ARABIC_TO_ENGLISH" | "ENGLISH_TO_ARABIC" | "CONTEXT" | "SRS_REVIEW";
type PlanQuestion = { key: string; lexemeId: number; occurrenceId: number; type: QuestionType };
type State = Pick<WordProgress, "correctCount" | "wrongCount" | "streakCorrect" | "easeFactor" | "intervalDays" | "averageResponseMs" | "masteryLevel" | "nextReviewAt">;

function english(value: string) { return value.toLowerCase().replace(/[^a-z0-9\s'-]/g, " ").replace(/\s+/g, " ").trim().replace(/^(the|a|an|to)\s+/, ""); }
function planFromJson(value: Prisma.JsonValue): PlanQuestion[] { return Array.isArray(value) ? value.filter((item): item is PlanQuestion => Boolean(item) && typeof item === "object" && !Array.isArray(item) && typeof (item as Record<string, unknown>).key === "string" && typeof (item as Record<string, unknown>).lexemeId === "number" && typeof (item as Record<string, unknown>).occurrenceId === "number" && typeof (item as Record<string, unknown>).type === "string") : []; }
export function shouldApplySessionSchedule(previous: Array<{ correct: boolean }>, correct: boolean) {
  return previous.length === 0 || (!correct && !previous.some((attempt) => !attempt.correct));
}
export function nextWeakReviewProgress(previous: { required: number; passed: number }, correct: boolean, isWeakReview: boolean) {
  if (!correct) return { required: 3, passed: 0 };
  if (!isWeakReview) return previous;
  const required = Math.max(3, previous.required);
  return { required, passed: Math.min(required, previous.passed + 1) };
}

async function lessonWords(unitNumber: number, lesson: number) {
  const rows = await prisma.wordOccurrence.findMany({
    where: { page: { juzId: 14, unitNumber }, lexeme: { courseStatus: "CORE", englishPrimary: { not: null } } },
    orderBy: [{ surah: "asc" }, { ayah: "asc" }, { wordPosition: "asc" }],
    select: { id: true, lexemeId: true }
  });
  const seen = new Set<number>();
  const unique = rows.filter((row) => !seen.has(row.lexemeId) && Boolean(seen.add(row.lexemeId)));
  return { words: unique.slice((lesson - 1) * 6, lesson * 6), lessonCount: Math.max(1, Math.ceil(unique.length / 6)) };
}

export async function createStudySession(learnerId: string, input: { kind: StudyKind; unitNumber?: number; lesson?: number; wordIds?: number[] }) {
  await ensureLearner(learnerId);
  let words: Array<{ id: number; lexemeId: number }> = [];
  let lessonCount: number | undefined;
  if (input.kind === "LESSON" || input.kind === "CHECKPOINT" || input.kind === "REPEAT") {
    if (!input.unitNumber || !input.lesson) throw new Error("A lesson session needs a unit and lesson.");
    const found = await lessonWords(input.unitNumber, input.lesson);
    words = found.words; lessonCount = found.lessonCount;
    if (!words.length || input.lesson > found.lessonCount) throw new Error("Lesson is not available.");
  } else {
    const ids = [...new Set(input.wordIds ?? [])];
    if (!ids.length || ids.length > 100) throw new Error("Choose between 1 and 100 review words.");
    const rows = await prisma.wordProgress.findMany({
      where: { learnerId, lexemeId: { in: ids }, ...(input.kind === "WEAK" ? { weakReviewRequired: { gt: 0 } } : { OR: [{ correctCount: { gt: 0 } }, { wrongCount: { gt: 0 } }] }), lexeme: { occurrences: { some: { page: { juzId: 14 } } } } },
      select: { lexemeId: true, weakReviewRequired: true, weakReviewPassed: true, lexeme: { select: { occurrences: { where: { page: { juzId: 14 } }, take: 1, orderBy: { id: "asc" }, select: { id: true } } } } }
    });
    if (rows.length !== ids.length || (input.kind === "WEAK" && rows.some((row) => row.weakReviewPassed >= row.weakReviewRequired))) throw new Error("Review words are invalid for this learner.");
    const map = new Map(rows.map((row) => [row.lexemeId, row.lexeme.occurrences[0]?.id]));
    words = ids.map((lexemeId) => ({ lexemeId, id: map.get(lexemeId)! })).filter((row) => Boolean(row.id));
  }
  const types: QuestionType[] = input.kind === "REVIEW" || input.kind === "ALL" || input.kind === "WEAK" ? ["SRS_REVIEW"] : ["MATCH", "ARABIC_TO_ENGLISH", "ENGLISH_TO_ARABIC", "CONTEXT"];
  const plan = words.flatMap((word) => types.map((type) => ({ key: `${word.lexemeId}:${type}`, lexemeId: word.lexemeId, occurrenceId: word.id, type })));
  const session = await prisma.studySession.create({ data: { learnerId, kind: input.kind, unitNumber: input.unitNumber, lesson: input.lesson, questionPlan: plan } });
  return { id: session.id, questions: plan.map(({ key, lexemeId, occurrenceId, type }) => ({ key, lexemeId, occurrenceId, type })), lessonCount };
}

function advanceWithoutSchedule(previous: State | undefined, correct: boolean, responseTimeMs?: number): State {
  const correctCount = (previous?.correctCount ?? 0) + (correct ? 1 : 0);
  const wrongCount = (previous?.wrongCount ?? 0) + (correct ? 0 : 1);
  const streakCorrect = correct ? (previous?.streakCorrect ?? 0) + 1 : 0;
  const oldAverage = previous?.averageResponseMs;
  const averageResponseMs = responseTimeMs == null ? oldAverage ?? null : oldAverage == null ? responseTimeMs : Math.round((oldAverage + responseTimeMs) / 2);
  return { correctCount, wrongCount, streakCorrect, easeFactor: previous?.easeFactor ?? 2.5, intervalDays: previous?.intervalDays ?? 0, averageResponseMs, masteryLevel: masteryFromProgress({ correctCount, wrongCount, streakCorrect, intervalDays: previous?.intervalDays ?? 0 }), nextReviewAt: previous?.nextReviewAt ?? null };
}

export async function recordStudyAttempt(learnerId: string, sessionId: string, input: { attemptId: string; questionKey: string; response: string; responseTimeMs?: number }) {
  await ensureLearner(learnerId);
  try {
    return await prisma.$transaction(async (tx) => {
      const duplicate = await tx.attempt.findUnique({ where: { clientAttemptId: input.attemptId }, select: { correct: true, xpAwarded: true, studySessionId: true } });
      if (duplicate) {
        if (duplicate.studySessionId !== sessionId) throw new Error("Attempt id belongs to another session.");
        return { correct: duplicate.correct, xpAwarded: duplicate.xpAwarded, duplicate: true };
      }
      const session = await tx.studySession.findFirst({ where: { id: sessionId, learnerId, status: "ACTIVE" } });
      if (!session) throw new Error("Study session is unavailable.");
      const question = planFromJson(session.questionPlan).find((item) => item.key === input.questionKey);
      if (!question) throw new Error("Question is not part of this session.");
      const occurrence = await tx.wordOccurrence.findFirst({ where: { id: question.occurrenceId, lexemeId: question.lexemeId, page: { juzId: 14 } }, include: { lexeme: true } });
      if (!occurrence?.lexeme.englishPrimary) throw new Error("Question vocabulary is unavailable.");
      const alternatives = (() => { try { const values = JSON.parse(occurrence.lexeme.englishAlternatives) as unknown; return Array.isArray(values) ? values.filter((value): value is string => typeof value === "string") : []; } catch { return []; } })();
      const correct = question.type === "ENGLISH_TO_ARABIC"
        ? normalizeArabic(input.response) === normalizeArabic(occurrence.arabic)
        : [occurrence.lexeme.englishPrimary, ...alternatives].map(english).includes(english(input.response));
      const earlier = await tx.attempt.findMany({ where: { studySessionId: sessionId, lexemeId: question.lexemeId }, select: { correct: true } });
      const applySchedule = shouldApplySessionSchedule(earlier, correct);
      const current = await tx.wordProgress.findUnique({ where: { learnerId_lexemeId: { learnerId, lexemeId: question.lexemeId } } });
      let state: State;
      if (applySchedule) {
        const quality = correct ? (input.responseTimeMs ?? 9999) <= 8000 ? 5 : 4 : 1;
        const schedule = nextReview({ quality, intervalDays: current?.intervalDays ?? 0, easeFactor: current?.easeFactor ?? 2.5 });
        state = advanceWithoutSchedule(current ?? undefined, correct, input.responseTimeMs);
        state = { ...state, easeFactor: schedule.easeFactor, intervalDays: schedule.intervalDays, nextReviewAt: schedule.nextReviewAt, masteryLevel: masteryFromProgress({ correctCount: state.correctCount, wrongCount: state.wrongCount, streakCorrect: state.streakCorrect, intervalDays: schedule.intervalDays }) };
      } else state = advanceWithoutSchedule(current ?? undefined, correct, input.responseTimeMs);
      const xpAwarded = earlier.length === 0 ? correct ? 10 : 2 : 0;
      const nextWeak = nextWeakReviewProgress({ required: current?.weakReviewRequired ?? 0, passed: current?.weakReviewPassed ?? 0 }, correct, session.kind === "WEAK");
      const weakUpdate = !correct || session.kind === "WEAK" ? { weakReviewRequired: nextWeak.required, weakReviewPassed: nextWeak.passed } : {};
      await tx.wordProgress.upsert({ where: { learnerId_lexemeId: { learnerId, lexemeId: question.lexemeId } }, update: { ...state, ...weakUpdate, lastReviewedAt: new Date() }, create: { learnerId, lexemeId: question.lexemeId, ...state, ...weakUpdate, lastReviewedAt: new Date() } });
      await tx.attempt.create({ data: { learnerId, lexemeId: question.lexemeId, occurrenceId: occurrence.id, exerciseType: question.type, correct, response: input.response, responseTimeMs: input.responseTimeMs, xpAwarded, clientAttemptId: input.attemptId, studySessionId: sessionId, questionKey: question.key } });
      const learner = await tx.learner.findUniqueOrThrow({ where: { id: learnerId } });
      await tx.learner.update({ where: { id: learnerId }, data: { xp: { increment: xpAwarded }, streakDays: nextStreak(learner.lastStudyDate, learner.streakDays), lastStudyDate: new Date() } });
      return { correct, xpAwarded, duplicate: false };
    }, { isolationLevel: "Serializable" });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      const duplicate = await prisma.attempt.findUnique({ where: { clientAttemptId: input.attemptId }, select: { correct: true, xpAwarded: true, studySessionId: true } });
      if (duplicate?.studySessionId === sessionId) return { correct: duplicate.correct, xpAwarded: duplicate.xpAwarded, duplicate: true };
    }
    throw error;
  }
}

export async function finalizeStudySession(learnerId: string, sessionId: string) {
  return prisma.$transaction(async (tx) => {
    const session = await tx.studySession.findFirst({ where: { id: sessionId, learnerId } });
    if (!session) throw new Error("Study session was not found.");
    if (session.status === "COMPLETED") return session.result;
    const plan = planFromJson(session.questionPlan);
    const attempts = await tx.attempt.findMany({ where: { studySessionId: sessionId }, orderBy: { createdAt: "asc" } });
    const mastered = new Set(attempts.filter((attempt) => attempt.correct).map((attempt) => attempt.questionKey));
    if (mastered.size !== plan.length) throw new Error("Every session question must be answered correctly before completion.");
    const firstByQuestion = new Map<string, boolean>();
    for (const attempt of attempts) if (attempt.questionKey && !firstByQuestion.has(attempt.questionKey)) firstByQuestion.set(attempt.questionKey, attempt.correct);
    const accuracy = plan.length ? [...firstByQuestion.values()].filter(Boolean).length / plan.length : 0;
    const result: Prisma.InputJsonValue = { accuracy, total: plan.length, attempts: attempts.length, passed: true };
    if (session.unitNumber && session.lesson && ["LESSON", "CHECKPOINT"].includes(session.kind)) {
      const page = await tx.page.findUniqueOrThrow({ where: { juzId_unitNumber: { juzId: 14, unitNumber: session.unitNumber } } });
      const lessonCount = Math.max(1, Math.ceil(page.coreWordCount / 6));
      const progress = await tx.pageProgress.findUnique({ where: { learnerId_pageId: { learnerId, pageId: page.id } } });
      if (session.lesson > maxAccessibleLesson(lessonCount, progress?.completedLessons ?? 0, progress?.reviewedLessons ?? 0, progress?.completed ?? false)) throw new Error("Lesson sequence is invalid.");
      const isCheckpoint = session.kind === "CHECKPOINT";
      if (isCheckpoint && (!progress || session.lesson > progress.completedLessons || session.lesson > progress.reviewedLessons + 1)) throw new Error("Lesson review sequence is invalid.");
      const completedLessons = isCheckpoint ? progress?.completedLessons ?? 0 : Math.max(progress?.completedLessons ?? 0, session.lesson);
      const reviewedLessons = isCheckpoint ? Math.max(progress?.reviewedLessons ?? 0, session.lesson) : progress?.reviewedLessons ?? 0;
      const completed = Boolean(progress?.completed) || reviewedLessons >= lessonCount;
      await tx.pageProgress.upsert({ where: { learnerId_pageId: { learnerId, pageId: page.id } }, update: { completedLessons, reviewedLessons, completed, lessonCount, masteryStars: Math.max(progress?.masteryStars ?? 0, starsForAccuracy(accuracy)), bestAccuracy: Math.max(progress?.bestAccuracy ?? 0, accuracy), sessions: { increment: 1 }, lastStudiedAt: new Date() }, create: { learnerId, pageId: page.id, completedLessons, reviewedLessons, completed, lessonCount, masteryStars: starsForAccuracy(accuracy), bestAccuracy: accuracy, sessions: 1, lastStudiedAt: new Date() } });
      await tx.learner.update({ where: { id: learnerId }, data: { xp: { increment: isCheckpoint ? 0 : 5 } } });
    }
    if (session.kind === "ALL") await tx.learner.update({ where: { id: learnerId }, data: { lastAllWordsReviewDate: new Date() } });
    await tx.studySession.update({ where: { id: sessionId }, data: { status: "COMPLETED", result, completedAt: new Date() } });
    return result;
  }, { isolationLevel: "Serializable" });
}
