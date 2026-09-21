import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashSessionToken, newSessionToken, SESSION_MAX_AGE_SECONDS } from "@/lib/session";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_ATTEMPT_LIMIT = 10;

export function loginRateLimitKey(email: string, forwardedFor: string | null) {
  const address = forwardedFor?.split(",")[0]?.trim() || "unknown";
  return `tv:${createHash("sha256").update(`${normalizeEmail(email)}|${address}`).digest("hex")}`;
}

export async function consumeLoginAttempt(key: string) {
  const now = new Date();
  const cutoff = new Date(now.getTime() - LOGIN_WINDOW_MS);
  const existing = await prisma.authRateLimit.findUnique({ where: { key } });
  if (existing && existing.windowStart > cutoff && existing.attemptCount >= LOGIN_ATTEMPT_LIMIT) return false;

  await prisma.authRateLimit.upsert({
    where: { key },
    update: existing && existing.windowStart > cutoff
      ? { attemptCount: { increment: 1 }, updatedAt: now }
      : { attemptCount: 1, windowStart: now, updatedAt: now },
    create: { key, windowStart: now, attemptCount: 1, updatedAt: now }
  });
  return true;
}

export async function clearLoginAttempts(key: string) {
  await prisma.authRateLimit.deleteMany({ where: { key } });
}

export async function createAuthSession(userId: string) {
  const token = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  await prisma.$transaction([
    prisma.authSession.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
    prisma.authSession.create({ data: { userId, tokenHash: hashSessionToken(token), expiresAt } })
  ]);
  return { token, expiresAt };
}

export async function mergeAnonymousProgress(userId: string, anonymousLearnerId: string | undefined, displayName: string) {
  return prisma.$transaction(async (tx) => {
    let target = await tx.learner.findUnique({ where: { userId } });
    if (!target) {
      target = await tx.learner.create({
        data: { id: `user_${userId}`, userId, displayName, isAnonymous: false }
      });
    }

    if (!anonymousLearnerId || anonymousLearnerId === target.id) return target;
    const source = await tx.learner.findFirst({
      where: { id: anonymousLearnerId, userId: null, isAnonymous: true }
    });
    if (!source) return target;

    await tx.$executeRaw`
      INSERT INTO "WordProgress" (
        "learnerId", "lexemeId", "masteryLevel", "correctCount", "wrongCount",
        "streakCorrect", "easeFactor", "intervalDays", "lastReviewedAt",
        "nextReviewAt", "averageResponseMs"
      )
      SELECT ${target.id}, "lexemeId", "masteryLevel", "correctCount", "wrongCount",
        "streakCorrect", "easeFactor", "intervalDays", "lastReviewedAt",
        "nextReviewAt", "averageResponseMs"
      FROM "WordProgress" WHERE "learnerId" = ${source.id}
      ON CONFLICT ("learnerId", "lexemeId") DO UPDATE SET
        "correctCount" = "WordProgress"."correctCount" + EXCLUDED."correctCount",
        "wrongCount" = "WordProgress"."wrongCount" + EXCLUDED."wrongCount",
        "streakCorrect" = GREATEST("WordProgress"."streakCorrect", EXCLUDED."streakCorrect"),
        "easeFactor" = GREATEST("WordProgress"."easeFactor", EXCLUDED."easeFactor"),
        "intervalDays" = GREATEST("WordProgress"."intervalDays", EXCLUDED."intervalDays"),
        "lastReviewedAt" = CASE
          WHEN "WordProgress"."lastReviewedAt" IS NULL THEN EXCLUDED."lastReviewedAt"
          WHEN EXCLUDED."lastReviewedAt" IS NULL THEN "WordProgress"."lastReviewedAt"
          ELSE GREATEST("WordProgress"."lastReviewedAt", EXCLUDED."lastReviewedAt") END,
        "nextReviewAt" = CASE
          WHEN "WordProgress"."nextReviewAt" IS NULL THEN EXCLUDED."nextReviewAt"
          WHEN EXCLUDED."nextReviewAt" IS NULL THEN "WordProgress"."nextReviewAt"
          ELSE LEAST("WordProgress"."nextReviewAt", EXCLUDED."nextReviewAt") END,
        "averageResponseMs" = COALESCE("WordProgress"."averageResponseMs", EXCLUDED."averageResponseMs"),
        "masteryLevel" = CASE
          WHEN EXCLUDED."correctCount" > "WordProgress"."correctCount" THEN EXCLUDED."masteryLevel"
          ELSE "WordProgress"."masteryLevel" END
    `;

    await tx.$executeRaw`
      INSERT INTO "PageProgress" (
        "learnerId", "pageId", "masteryStars", "completed", "completedLessons", "reviewedLessons",
        "lessonCount", "bestAccuracy", "sessions", "lastStudiedAt", "createdAt",
        "updatedAt"
      )
      SELECT ${target.id}, "pageId", "masteryStars", "completed", "completedLessons", "reviewedLessons",
        "lessonCount", "bestAccuracy", "sessions", "lastStudiedAt", "createdAt",
        "updatedAt"
      FROM "PageProgress" WHERE "learnerId" = ${source.id}
      ON CONFLICT ("learnerId", "pageId") DO UPDATE SET
        "masteryStars" = GREATEST("PageProgress"."masteryStars", EXCLUDED."masteryStars"),
        "completed" = "PageProgress"."completed" OR EXCLUDED."completed",
        "completedLessons" = GREATEST("PageProgress"."completedLessons", EXCLUDED."completedLessons"),
        "reviewedLessons" = GREATEST("PageProgress"."reviewedLessons", EXCLUDED."reviewedLessons"),
        "lessonCount" = GREATEST("PageProgress"."lessonCount", EXCLUDED."lessonCount"),
        "bestAccuracy" = GREATEST("PageProgress"."bestAccuracy", EXCLUDED."bestAccuracy"),
        "sessions" = "PageProgress"."sessions" + EXCLUDED."sessions",
        "lastStudiedAt" = CASE
          WHEN "PageProgress"."lastStudiedAt" IS NULL THEN EXCLUDED."lastStudiedAt"
          WHEN EXCLUDED."lastStudiedAt" IS NULL THEN "PageProgress"."lastStudiedAt"
          ELSE GREATEST("PageProgress"."lastStudiedAt", EXCLUDED."lastStudiedAt") END,
        "updatedAt" = CURRENT_TIMESTAMP
    `;

    await tx.attempt.updateMany({ where: { learnerId: source.id }, data: { learnerId: target.id } });
    target = await tx.learner.update({
      where: { id: target.id },
      data: {
        displayName,
        xp: target.xp + source.xp,
        streakDays: Math.max(target.streakDays, source.streakDays),
        tafsirAttempts: target.tafsirAttempts + source.tafsirAttempts,
        tafsirSuccessful: target.tafsirSuccessful + source.tafsirSuccessful,
        lastStudyDate: !target.lastStudyDate ? source.lastStudyDate : !source.lastStudyDate ? target.lastStudyDate : target.lastStudyDate > source.lastStudyDate ? target.lastStudyDate : source.lastStudyDate
      }
    });
    await tx.learner.delete({ where: { id: source.id } });
    return target;
  }, { timeout: 20000 });
}
