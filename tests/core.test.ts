import test from "node:test";
import assert from "node:assert/strict";
import { normalizeArabic, courseStatusFor } from "../src/lib/arabic";
import { masteryFromProgress, starsForAccuracy } from "../src/lib/mastery";
import { nextReview } from "../src/lib/srs";
import { hashPassword, verifyPassword } from "../src/lib/password";
import { maxAccessibleLesson } from "../src/lib/course";
import { hasMeaningfulNoteContent } from "../src/lib/tafsir-notes";
import { advanceWordProgress } from "../src/lib/progress";

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
