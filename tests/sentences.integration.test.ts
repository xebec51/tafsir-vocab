import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/prisma";
import { createSentenceSession, answerSentence, getSentenceSession, finalizeSentenceSession } from "../src/lib/sentence-sessions";
import { mergeSentenceProgress } from "../src/lib/sentence-progress";
import { missingPhrase, normalizeTranslation, sentenceScheduleApplies, translationMatches, type SentenceMode, type SentenceQuestion } from "../src/lib/sentence-quiz";
import source from "./fixtures/sentence-source.json";

test("translation rubric tolerates punctuation but never silently accepts a changed meaning", () => {
  assert.equal(normalizeTranslation("  Allah's   promise. "), "allah s promise");
  assert.equal(translationMatches("Preserved!", "preserved"), true);
  assert.equal(translationMatches("not preserved", "preserved"), false);
  assert.equal(translationMatches("an approved equivalent", "reference", ["An approved equivalent"]), true);
  assert.equal(missingPhrase("Too short"), null);
  assert.equal(sentenceScheduleApplies([{ correct: true }], true, new Date()), false);
  assert.equal(sentenceScheduleApplies([{ correct: true }], false, new Date()), true);
  assert.equal(sentenceScheduleApplies([{ correct: false }], false, new Date()), false);
  assert.equal(sentenceScheduleApplies([], true, new Date()), false);
});

test("PostgreSQL sentence sessions preserve attempts, schedules and ownership", async (suite) => {
  const host = new URL(process.env.DATABASE_URL ?? "postgresql://unused@localhost/unused").hostname;
  assert.ok(["localhost", "127.0.0.1"].includes(host) || process.env.SENTENCE_TEST_DATABASE === "1", "Use an explicitly selected isolated validation database.");
  const prefix = `sentence_test_${randomUUID()}`;
  const learnerA = `${prefix}_a`, learnerB = `${prefix}_b`;
  const ids: string[] = [];
  const createdVerses: number[] = [];
  await prisma.learner.createMany({ data: [{ id: learnerA }, { id: learnerB }] });
  try {
    const page = await prisma.page.findUniqueOrThrow({ where: { juzId_mushafPage: { juzId: 14, mushafPage: 262 } } });
    for (const [index, item] of source.entries()) {
      const old = await prisma.verse.findUnique({ where: { surah_ayahNumber: { surah: item.surah, ayahNumber: item.ayahNumber } } });
      const verse = old ?? await prisma.verse.create({ data: { surah: item.surah, ayahNumber: item.ayahNumber, arabicText: item.arabic } });
      if (!old) createdVerses.push(verse.id);
      const segment = await prisma.sentenceSegment.create({ data: { id: `${prefix}_${index}`, pageId: page.id, verseId: verse.id, verseOrder: 9000 + index, segmentOrder: 9000 + index, arabicText: item.arabic, englishTranslation: item.english, translationSource: item.source, sourceUrl: item.url, audioUrl: item.audioUrl, audioVerified: index === 3 && Boolean(item.audioUrl), curationStatus: "READY" } });
      ids.push(segment.id);
    }
    const create = async (mode: SentenceMode = "ARABIC_TO_ENGLISH", segmentId = ids[0]) => createSentenceSession(learnerA, { requestId: randomUUID(), mode, scope: "page", segmentId });
    const question = async (id: string) => (await prisma.sentenceQuizSession.findUniqueOrThrow({ where: { id } })).questionPlan as unknown as SentenceQuestion[];
    const answer = (id: string, q: SentenceQuestion, response = q.expected, attemptId = randomUUID()) => answerSentence(learnerA, id, { attemptId, questionKey: q.key, response, responseTimeMs: 2000 });

    await suite.test("all reliable modes construct valid four-option questions and preserve source Arabic", async () => {
      for (const mode of ["ARABIC_TO_ENGLISH", "ENGLISH_TO_ARABIC", "CONTEXT", "MISSING_PHRASE", "TYPING", "MATCH"] as SentenceMode[]) {
        const { id } = await create(mode);
        const fresh = await getSentenceSession(learnerA, id);
        assert.equal(fresh.total, 1);
        assert.equal("expected" in fresh.questions[0], false);
        const [q] = await question(id);
        assert.equal(q.arabic, source[0].arabic);
        if (mode !== "TYPING" && mode !== "MATCH") { assert.equal(q.options.length, 4); assert.ok(q.options.includes(q.expected)); }
        assert.equal((await answer(id, q)).correct, true);
        await finalizeSentenceSession(learnerA, id);
      }
      await assert.rejects(create("LISTENING"), /verified audio/);
      const listening = await create("LISTENING", ids[3]);
      const [listeningQuestion] = await question(listening.id);
      assert.equal(listeningQuestion.audioUrl, source[3].audioUrl);
      assert.equal((await answer(listening.id, listeningQuestion)).correct, true);
    });
    await suite.test("session creation and concurrent retries cannot duplicate XP, attempts or mastery", async () => {
      const request = { requestId: randomUUID(), mode: "ARABIC_TO_ENGLISH" as const, scope: "page" as const, segmentId: ids[1] };
      const xpBeforePreparation = (await prisma.learner.findUniqueOrThrow({ where: { id: learnerA } })).xp;
      const [one, two] = await Promise.all([createSentenceSession(learnerA, request), createSentenceSession(learnerA, request)]);
      assert.equal(one.id, two.id);
      assert.equal((await prisma.learner.findUniqueOrThrow({ where: { id: learnerA } })).xp, xpBeforePreparation);
      assert.equal(one.session.attempts, 0);
      assert.equal(one.session.questions[0].segmentId, ids[1]);
      const [q] = await question(one.id);
      const attemptId = randomUUID();
      const before = await prisma.learner.findUniqueOrThrow({ where: { id: learnerA } });
      await Promise.all([answer(one.id, q, q.expected, attemptId), answer(one.id, q, q.expected, attemptId)]);
      assert.equal(await prisma.sentenceQuizAttempt.count({ where: { sessionId: one.id } }), 1);
      assert.equal((await prisma.learner.findUniqueOrThrow({ where: { id: learnerA } })).xp - before.xp, 10);
      // Simulate a lost response after commit: retry the same identity again.
      await answer(one.id, q, q.expected, attemptId);
      const results = await Promise.all([finalizeSentenceSession(learnerA, one.id), finalizeSentenceSession(learnerA, one.id)]);
      assert.deepEqual(results[0], results[1]);
      assert.deepEqual(await finalizeSentenceSession(learnerA, one.id), results[0]);
    });
    await suite.test("a wrong answer returns to the queue and prevents completion; later success does not inflate SRS", async () => {
      const { id } = await create("ARABIC_TO_ENGLISH", ids[2]);
      const [q] = await question(id);
      const wrong = q.options.find((option) => option !== q.expected)!;
      const failed = await answer(id, q, wrong);
      assert.equal(failed.correct, false);
      assert.deepEqual(failed.progress, { queue: [q.key], total: 1, attempts: 1, correct: 0 });
      await assert.rejects(finalizeSentenceSession(learnerA, id), /every sentence/);
      const restored = await getSentenceSession(learnerA, id);
      assert.deepEqual(restored.queue, [q.key]);
      assert.equal(restored.attempts, 1);
      await answer(id, q);
      const progress = await prisma.sentenceProgress.findUniqueOrThrow({ where: { learnerId_segmentId: { learnerId: learnerA, segmentId: ids[2] } } });
      assert.equal(progress.intervalDays, 0);
      assert.equal(progress.wrongCount, 1);
      const result = await finalizeSentenceSession(learnerA, id) as { accuracy: number };
      assert.equal(result.accuracy, 50);
      assert.equal((await getSentenceSession(learnerA, id)).status, "COMPLETED");
    });
    await suite.test("forged payloads and another learner cannot read, answer, replay or finish a session", async () => {
      const { id } = await create(); const [q] = await question(id);
      await assert.rejects(getSentenceSession(learnerB, id), /not found/);
      await assert.rejects(finalizeSentenceSession(learnerB, id), /not found/);
      await assert.rejects(answerSentence(learnerB, id, { attemptId: randomUUID(), questionKey: q.key, response: q.expected, responseTimeMs: 0 }), /not found/);
      await assert.rejects(answer(id, q, "A forged unrelated option"), /available answer/);
      await assert.rejects(answerSentence(learnerA, id, { attemptId: randomUUID(), questionKey: "not-in-plan", response: q.expected, responseTimeMs: 0 }), /does not belong/);
      const token = randomUUID(); await answer(id, q, q.expected, token);
      await assert.rejects(answer(id, q, "changed payload", token), /conflicts/);
      assert.equal(await prisma.sentenceProgress.count({ where: { learnerId: learnerB } }), 0);
      assert.equal(await prisma.wordProgress.count({ where: { learnerId: learnerA } }), 0);
    });
    await suite.test("immediate repeat sessions do not lengthen an interval repeatedly", async () => {
      const before = await prisma.sentenceProgress.findUniqueOrThrow({ where: { learnerId_segmentId: { learnerId: learnerA, segmentId: ids[1] } } });
      for (let i = 0; i < 2; i++) { const { id } = await create("CONTEXT", ids[1]); const [q] = await question(id); await answer(id, q); }
      const after = await prisma.sentenceProgress.findUniqueOrThrow({ where: { id: before.id } });
      assert.equal(after.intervalDays, before.intervalDays);
      assert.equal(after.nextReviewAt?.getTime(), before.nextReviewAt?.getTime());
    });
    await suite.test("anonymous sentence history and sessions merge without losing existing target progress", async () => {
      const before = await prisma.sentenceProgress.findMany({ where: { learnerId: learnerA } });
      await prisma.sentenceProgress.create({ data: { learnerId: learnerB, segmentId: ids[0], wrongCount: 2 } });
      await prisma.$transaction((tx) => mergeSentenceProgress(tx, learnerA, learnerB), { timeout: 20000 });
      const merged = await prisma.sentenceProgress.findUniqueOrThrow({ where: { learnerId_segmentId: { learnerId: learnerB, segmentId: ids[0] } } });
      assert.equal(merged.wrongCount, before.find((row) => row.segmentId === ids[0])!.wrongCount + 2);
      assert.equal(merged.correctCount, before.find((row) => row.segmentId === ids[0])!.correctCount);
      assert.equal(await prisma.sentenceQuizSession.count({ where: { learnerId: learnerA } }), 0);
      assert.ok(await prisma.sentenceQuizAttempt.count({ where: { learnerId: learnerB } }) > 0);
    });
  } finally {
    await prisma.sentenceQuizAttempt.deleteMany({ where: { learnerId: { in: [learnerA, learnerB] } } });
    await prisma.learner.deleteMany({ where: { id: { in: [learnerA, learnerB] } } });
    await prisma.sentenceSegment.deleteMany({ where: { id: { in: ids } } });
    await prisma.verse.deleteMany({ where: { id: { in: createdVerses } } });
    await prisma.$disconnect();
  }
});
