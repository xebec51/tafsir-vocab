import { NextResponse } from "next/server";
import { countLearnedWords, getCourseDistractorWords, getLearnedWords, getReviewWords } from "@/lib/course";
import { getLearnerId } from "@/lib/session";
import { allReviewSessionPlan } from "@/lib/review-plan";

export async function GET(request: Request) {
  const learnerId = await getLearnerId();
  const scope = new URL(request.url).searchParams.get("scope");
  if (scope === "all") {
    const total = await countLearnedWords(learnerId);
    const plan = allReviewSessionPlan(total);
    const requested = Number(new URL(request.url).searchParams.get("session") ?? "1");
    const active = plan[Math.min(Math.max(0, Number.isInteger(requested) ? requested - 1 : 0), Math.max(0, plan.length - 1))];
    const words = await getLearnedWords(learnerId, active ? { skip: active.offset, take: active.size } : undefined);
    const distractors = words.length > 0 && words.length < 4 ? await getCourseDistractorWords(learnerId, 12) : [];
    return NextResponse.json({ words, distractors, scope: "all", total, sessions: plan, activeSession: active?.number ?? null });
  }
  const [words, distractors] = await Promise.all([
    getReviewWords(learnerId, 24),
    getCourseDistractorWords(learnerId, 80)
  ]);
  return NextResponse.json({ words, distractors, scope: "due" });
}
