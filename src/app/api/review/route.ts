import { NextResponse } from "next/server";
import { getCourseDistractorWords, getReviewWords } from "@/lib/course";
import { getLearnerId } from "@/lib/session";

export async function GET() {
  const learnerId = await getLearnerId();
  const [words, distractors] = await Promise.all([
    getReviewWords(learnerId, 24),
    getCourseDistractorWords(learnerId, 80)
  ]);
  return NextResponse.json({ words, distractors });
}
