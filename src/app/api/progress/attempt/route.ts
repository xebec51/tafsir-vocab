import { NextResponse } from "next/server";
import { z } from "zod";
import { getLearnerId } from "@/lib/session";
import { recordAttempts } from "@/lib/progress";

const Body = z.object({
  lexemeId: z.number().int().positive(),
  occurrenceId: z.number().int().positive().optional(),
  exerciseType: z.string().min(1).max(50),
  correct: z.boolean(),
  response: z.string().max(1000).optional(),
  responseTimeMs: z.number().int().nonnegative().max(600000).optional()
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid attempt." }, { status: 400 });

  try {
    const learnerId = await getLearnerId();
    return NextResponse.json(await recordAttempts(learnerId, [parsed.data]));
  } catch (error) {
    console.error("Could not record review attempt", error);
    return NextResponse.json({ error: "Progress could not be saved. Please try again." }, { status: 503 });
  }
}
