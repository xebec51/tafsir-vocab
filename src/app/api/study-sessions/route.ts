import { NextResponse } from "next/server";
import { z } from "zod";
import { getLearnerId } from "@/lib/session";
import { createStudySession } from "@/lib/study-sessions";

const Body = z.object({ kind: z.enum(["LESSON", "CHECKPOINT", "REPEAT", "REVIEW", "ALL", "WEAK"]), unitNumber: z.number().int().min(1).max(20).optional(), lesson: z.number().int().min(1).max(50).optional(), wordIds: z.array(z.number().int().positive()).max(100).optional() });

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid study session." }, { status: 400 });
  try { return NextResponse.json(await createStudySession(await getLearnerId(), parsed.data)); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Session could not be created." }, { status: 409 }); }
}
