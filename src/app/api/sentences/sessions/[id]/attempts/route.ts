import { NextResponse } from "next/server";
import { z } from "zod";
import { getLearnerId } from "@/lib/session";
import { answerSentence, SentenceError } from "@/lib/sentence-sessions";
import { sentenceBody, sentenceError } from "@/lib/sentence-http";
const Body = z.object({ attemptId: z.uuid(), questionKey: z.string().min(1).max(80), response: z.string().min(1).max(8000), responseTimeMs: z.number().int().min(0).max(86400000) }).strict();
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const parsed = Body.safeParse(await sentenceBody(request));
    if (!parsed.success) throw new SentenceError("Invalid sentence answer.");
    return NextResponse.json(await answerSentence(await getLearnerId(), (await context.params).id, parsed.data));
  } catch (error) { return sentenceError(error); }
}
