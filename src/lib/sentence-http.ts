import { NextResponse } from "next/server";
import { SentenceError } from "@/lib/sentence-sessions";

export async function sentenceBody(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > 24000) throw new SentenceError("Request is too large.", 413);
  const raw = await request.text();
  if (raw.length > 24000) throw new SentenceError("Request is too large.", 413);
  try { return JSON.parse(raw) as unknown; } catch { throw new SentenceError("Invalid JSON."); }
}
export function sentenceError(error: unknown) {
  return NextResponse.json({ error: error instanceof SentenceError ? error.message : "Sentence progress could not be saved. Please retry." }, { status: error instanceof SentenceError ? error.status : 503, headers: { "Cache-Control": "private, no-store" } });
}
