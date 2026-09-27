import { NextResponse } from "next/server";
import { z } from "zod";
import { getLearnerId } from "@/lib/session";
import { recordStudyAttempt } from "@/lib/study-sessions";

const Body = z.object({ attemptId: z.string().uuid(), questionKey: z.string().min(3).max(100), response: z.string().max(1000), responseTimeMs: z.number().int().nonnegative().max(600000).optional() });
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid attempt." }, { status: 400 });
  try { return NextResponse.json(await recordStudyAttempt(await getLearnerId(), (await params).id, parsed.data)); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Attempt could not be recorded." }, { status: 409 }); }
}
