import { NextResponse } from "next/server";
import { getLearnerId } from "@/lib/session";
import { finalizeStudySession } from "@/lib/study-sessions";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { return NextResponse.json(await finalizeStudySession(await getLearnerId(), (await params).id)); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Session could not be finalized." }, { status: 409 }); }
}
