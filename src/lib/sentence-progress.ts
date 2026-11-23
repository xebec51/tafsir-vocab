import type { Prisma } from "@prisma/client";
import { masteryFromProgress } from "@/lib/mastery";

export async function mergeSentenceProgress(tx: Prisma.TransactionClient, sourceId: string, targetId: string) {
  await tx.$queryRaw`SELECT "id" FROM "Learner" WHERE "id" IN (${sourceId}, ${targetId}) ORDER BY "id" FOR UPDATE`;
  const rows = await tx.sentenceProgress.findMany({ where: { learnerId: sourceId } });
  const targets = await tx.sentenceProgress.findMany({ where: { learnerId: targetId, segmentId: { in: rows.map((row) => row.segmentId) } } });
  const bySegment = new Map(targets.map((row) => [row.segmentId, row]));
  const merged = rows.map((source) => {
    const target = bySegment.get(source.segmentId);
    if (!target) {
      const { id: _id, ...progress } = source;
      return { ...progress, learnerId: targetId };
    }
    const latest = (source.lastReviewedAt?.getTime() ?? 0) > (target.lastReviewedAt?.getTime() ?? 0) ? source : target;
    const correctCount = target.correctCount + source.correctCount;
    const wrongCount = target.wrongCount + source.wrongCount;
    const nextReviewAt = source.nextReviewAt && target.nextReviewAt ? new Date(Math.min(source.nextReviewAt.getTime(), target.nextReviewAt.getTime())) : source.nextReviewAt ?? target.nextReviewAt;
    return { learnerId: targetId, segmentId: source.segmentId,
      correctCount, wrongCount, streakCorrect: latest.streakCorrect, intervalDays: latest.intervalDays,
      easeFactor: latest.easeFactor, lastReviewedAt: latest.lastReviewedAt, nextReviewAt,
      completedAt: target.completedAt ?? source.completedAt,
      masteryLevel: masteryFromProgress({ correctCount, wrongCount, streakCorrect: latest.streakCorrect, intervalDays: latest.intervalDays })
    };
  });
  if (merged.length) await tx.$executeRaw`
    INSERT INTO "SentenceProgress" ("learnerId", "segmentId", "correctCount", "wrongCount", "streakCorrect", "intervalDays", "easeFactor", "lastReviewedAt", "nextReviewAt", "completedAt", "masteryLevel")
    SELECT "learnerId", "segmentId", "correctCount", "wrongCount", "streakCorrect", "intervalDays", "easeFactor", "lastReviewedAt", "nextReviewAt", "completedAt", "masteryLevel"
    FROM jsonb_to_recordset(${JSON.stringify(merged)}::jsonb) AS progress(
      "learnerId" text, "segmentId" text, "correctCount" integer, "wrongCount" integer,
      "streakCorrect" integer, "intervalDays" integer, "easeFactor" double precision,
      "lastReviewedAt" timestamp, "nextReviewAt" timestamp, "completedAt" timestamp, "masteryLevel" text
    )
    ON CONFLICT ("learnerId", "segmentId") DO UPDATE SET
      "correctCount" = EXCLUDED."correctCount", "wrongCount" = EXCLUDED."wrongCount",
      "streakCorrect" = EXCLUDED."streakCorrect", "intervalDays" = EXCLUDED."intervalDays",
      "easeFactor" = EXCLUDED."easeFactor", "lastReviewedAt" = EXCLUDED."lastReviewedAt",
      "nextReviewAt" = EXCLUDED."nextReviewAt", "completedAt" = EXCLUDED."completedAt",
      "masteryLevel" = EXCLUDED."masteryLevel"
  `;
  await tx.sentenceProgress.deleteMany({ where: { learnerId: sourceId } });
  await tx.sentenceQuizSession.updateMany({ where: { learnerId: sourceId }, data: { learnerId: targetId } });
  await tx.sentenceQuizAttempt.updateMany({ where: { learnerId: sourceId }, data: { learnerId: targetId } });
}
