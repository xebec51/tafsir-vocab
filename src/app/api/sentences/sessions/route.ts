import { NextResponse } from "next/server";
import { z } from "zod";
import { getLearnerId } from "@/lib/session";
import { createSentenceSession, SentenceError } from "@/lib/sentence-sessions";
import { SENTENCE_MODES } from "@/lib/sentence-quiz";
import { sentenceBody, sentenceError } from "@/lib/sentence-http";

const Body = z.object({ requestId: z.uuid(), mode: z.enum(SENTENCE_MODES), scope: z.enum(["page", "due", "weak"]), page: z.number().int().min(262).max(281).optional(), segmentId: z.string().min(1).max(80).optional(), retrySessionId: z.string().min(1).max(80).optional() }).strict();
export async function POST(request: Request) {
  try {
    const parsed = Body.safeParse(await sentenceBody(request));
    if (!parsed.success) throw new SentenceError("Invalid sentence selection.");
    return NextResponse.json(await createSentenceSession(await getLearnerId(), parsed.data), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return sentenceError(error); }
}
