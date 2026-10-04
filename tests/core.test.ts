import test from "node:test";
import assert from "node:assert/strict";
import { normalizeArabic, courseStatusFor } from "../src/lib/arabic";
import { masteryFromProgress, starsForAccuracy } from "../src/lib/mastery";
import { nextReview } from "../src/lib/srs";
import { hashPassword, verifyPassword } from "../src/lib/password";
import { maxAccessibleLesson } from "../src/lib/course";
import { categoriesToDocument, hasMeaningfulNoteContent } from "../src/lib/tafsir-notes";
import { advanceWordProgress } from "../src/lib/progress";
import { allReviewSessionPlan } from "../src/lib/review-plan";
import { advanceMasteryQueue, shuffleReviewQueue } from "../src/lib/mastery-queue";
import { nextWeakReviewProgress, shouldApplySessionSchedule } from "../src/lib/study-sessions";

test("Arabic normalization removes harakat and orthographic variants", () => {
  assert.equal(normalizeArabic("ٱلْعِلْمَ"), "العلم");
});

test("common particles are support vocabulary", () => {
  assert.equal(courseStatusFor("مِن", "from"), "SUPPORT");
  assert.equal(courseStatusFor("رَوَاسِيَ", "firm mountains"), "CORE");
});

test("SRS schedules new correct items for tomorrow", () => {
  assert.equal(nextReview({ quality: 5, intervalDays: 0, easeFactor: 2.5 }).intervalDays, 1);
});

test("SRS returns failed retrievals after ten minutes", () => {
  const now = new Date("2026-09-17T10:00:00Z");
  const result = nextReview({ quality: 1, intervalDays: 14, easeFactor: 2.5, now });
  assert.equal(result.intervalDays, 0);
  assert.equal(result.nextReviewAt.getTime() - now.getTime(), 10 * 60 * 1000);
});

test("mastery grows with retrieval history", () => {
  assert.equal(masteryFromProgress({ correctCount: 10, wrongCount: 1, streakCorrect: 4, intervalDays: 14 }), "MASTERED");
  assert.equal(starsForAccuracy(.91), 3);
});

test("password hashes are salted and verifiable", async () => {
  const first = await hashPassword("correct-horse-42");
  const second = await hashPassword("correct-horse-42");
  assert.notEqual(first, second);
  assert.equal(await verifyPassword("correct-horse-42", first), true);
  assert.equal(await verifyPassword("wrong-password", first), false);
});

test("SRS repairs invalid historic intervals before scheduling", () => {
  const now = new Date("2026-09-17T10:00:00Z");
  const result = nextReview({ quality: 5, intervalDays: 9_999_999, easeFactor: 100, now });
  assert.equal(result.intervalDays, 1);
  assert.equal(result.nextReviewAt.getTime() - now.getTime(), 24 * 60 * 60 * 1000);
  assert.equal(result.easeFactor, 2.6);
});

test("lesson access advances only one lesson beyond saved progress", () => {
  assert.equal(maxAccessibleLesson(13, 0, 0), 1);
  assert.equal(maxAccessibleLesson(13, 1, 0), 1);
  assert.equal(maxAccessibleLesson(13, 1, 1), 2);
  assert.equal(maxAccessibleLesson(13, 9, 8), 9);
  assert.equal(maxAccessibleLesson(13, 99, 99), 13);
  assert.equal(maxAccessibleLesson(13, 1, 0, true), 13);
});

test("batched attempts advance repeated word progress sequentially", () => {
  const now = new Date("2026-09-22T10:00:00Z");
  const first = advanceWordProgress(undefined, { correct: true, responseTimeMs: 3000 }, now);
  const second = advanceWordProgress(first, { correct: true, responseTimeMs: 5000 }, now);
  const failed = advanceWordProgress(second, { correct: false, responseTimeMs: 9000 }, now);

  assert.equal(second.correctCount, 2);
  assert.equal(second.streakCorrect, 2);
  assert.equal(second.intervalDays, 3);
  assert.equal(failed.correctCount, 2);
  assert.equal(failed.wrongCount, 1);
  assert.equal(failed.streakCorrect, 0);
  assert.equal(failed.intervalDays, 0);
});

test("tafsir note completion ignores empty structured placeholders", () => {
  assert.equal(hasMeaningfulNoteContent({ hasAsbab: "unknown", background: "", references: {} }), false);
  assert.equal(hasMeaningfulNoteContent({ hasAsbab: "no", background: "" }), true);
  assert.equal(hasMeaningfulNoteContent({ points: ["", { meaning: "Divine preservation" }] }), true);
});

test("passage note categories preserve an asbab report's specific ayat", () => {
  const restored = categoriesToDocument([{
    category: "asbabun_nuzul",
    content: { background: "A reported setting", relatedVerses: ["15:9", "15:10"] }
  }], null, []);
  assert.deepEqual(restored.asbabRelatedVerses, ["15:9", "15:10"]);
  assert.equal(restored.asbabBackground, "A reported setting");
});

test("all-word review sessions stay balanced and never exceed one hundred words", () => {
  assert.deepEqual(allReviewSessionPlan(100).map((session) => session.size), [100]);
  assert.deepEqual(allReviewSessionPlan(101).map((session) => session.size), [51, 50]);
  assert.deepEqual(allReviewSessionPlan(201).map((session) => session.size), [67, 67, 67]);
  assert.equal(allReviewSessionPlan(347).every((session) => session.size <= 100), true);
});

test("mastery quiz queues missed questions at the back until recalled", () => {
  assert.deepEqual(advanceMasteryQueue(["first", "second", "third"], false), ["second", "third", "first"]);
  assert.deepEqual(advanceMasteryQueue(["first", "second"], true), ["second"]);
});

test("review queue shuffles without mutating the source order", () => {
  const words = [1, 2, 3, 4];
  assert.deepEqual(shuffleReviewQueue(words, () => 0), [2, 3, 4, 1]);
  assert.deepEqual(words, [1, 2, 3, 4]);
});

test("a session schedules each word once, while its first miss still repairs review timing", () => {
  assert.equal(shouldApplySessionSchedule([], true), true);
  assert.equal(shouldApplySessionSchedule([{ correct: true }], true), false);
  assert.equal(shouldApplySessionSchedule([{ correct: false }], true), false);
  assert.equal(shouldApplySessionSchedule([{ correct: true }], false), true);
  assert.equal(shouldApplySessionSchedule([{ correct: false }], false), false);
});

test("a weak word needs three consecutive weak-focus recalls after a mistake", () => {
  let state = nextWeakReviewProgress({ required: 0, passed: 0 }, false, false);
  assert.deepEqual(state, { required: 3, passed: 0 });
  state = nextWeakReviewProgress(state, true, true);
  state = nextWeakReviewProgress(state, true, true);
  assert.deepEqual(state, { required: 3, passed: 2 });
  state = nextWeakReviewProgress(state, false, true);
  assert.deepEqual(state, { required: 3, passed: 0 });
  state = nextWeakReviewProgress(state, true, true);
  state = nextWeakReviewProgress(state, true, true);
  state = nextWeakReviewProgress(state, true, true);
  assert.deepEqual(state, { required: 3, passed: 3 });
});
