import { prisma } from "@/lib/prisma";

export async function ensureLearner(learnerId: string) {
  return prisma.learner.upsert({
    where: { id: learnerId },
    update: {},
    create: { id: learnerId, displayName: "Learner" }
  });
}

function jakartaDateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric", month: "2-digit", day: "2-digit"
  }).format(date);
}

export function nextStreak(lastStudyDate: Date | null, currentStreak: number) {
  const now = new Date();
  const todayKey = jakartaDateKey(now);
  if (!lastStudyDate) return 1;
  const lastKey = jakartaDateKey(lastStudyDate);
  if (lastKey === todayKey) return Math.max(1, currentStreak);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return lastKey === jakartaDateKey(yesterday) ? currentStreak + 1 : 1;
}
