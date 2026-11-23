import { NextResponse } from "next/server";
import { getLearnerId } from "@/lib/session";
import { finalizeSentenceSession } from "@/lib/sentence-sessions";
import { sentenceError } from "@/lib/sentence-http";
export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try { return NextResponse.json(await finalizeSentenceSession(await getLearnerId(), (await context.params).id)); }
  catch (error) { return sentenceError(error); }
}
