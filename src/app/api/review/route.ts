import { NextResponse } from "next/server";
import { getCourseDistractorWords, getLearnedWords, getReviewWords } from "@/lib/course";
import { getLearnerId } from "@/lib/session";

export async function GET(request: Request) {
  const learnerId = await getLearnerId();
  const scope = new URL(request.url).searchParams.get("scope");
  if (scope === "all") {
    const words = await getLearnedWords(learnerId);
    const distractors = words.length > 0 && words.length < 4 ? await getCourseDistractorWords(learnerId, 12) : [];
    return NextResponse.json({ words, distractors, scope: "all" });
  }
  const [words, distractors] = await Promise.all([
    getReviewWords(learnerId, 24),
    getCourseDistractorWords(learnerId, 80)
  ]);
  return NextResponse.json({ words, distractors, scope: "due" });
}
