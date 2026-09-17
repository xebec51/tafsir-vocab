import { NextResponse } from "next/server";
import { getReviewWords } from "@/lib/course";
import { getLearnerId } from "@/lib/session";

export async function GET() {
  const learnerId = await getLearnerId();
  return NextResponse.json({ words: await getReviewWords(learnerId, 24) });
}
