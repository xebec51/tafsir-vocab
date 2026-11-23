import { NextResponse } from "next/server";
import { getLearnerId } from "@/lib/session";
import { getSentenceSession } from "@/lib/sentence-sessions";
import { sentenceError } from "@/lib/sentence-http";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try { return NextResponse.json(await getSentenceSession(await getLearnerId(), (await context.params).id), { headers: { "Cache-Control": "private, no-store" } }); }
  catch (error) { return sentenceError(error); }
}
