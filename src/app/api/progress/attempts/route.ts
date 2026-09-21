import { NextResponse } from "next/server";
import { z } from "zod";
import { getLearnerId } from "@/lib/session";
import { recordAttempts } from "@/lib/progress";

const Attempt = z.object({
  lexemeId: z.number().int().positive(),
  occurrenceId: z.number().int().positive().optional(),
  exerciseType: z.string().min(1).max(50),
  correct: z.boolean(),
  response: z.string().max(1000).optional(),
  responseTimeMs: z.number().int().nonnegative().max(600000).optional()
});

const Body = z.object({ attempts: z.array(Attempt).min(1).max(100) });

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid attempts." }, { status: 400 });

  const learnerId = await getLearnerId();
  const result = await recordAttempts(learnerId, parsed.data.attempts);
  return NextResponse.json(result);
}
