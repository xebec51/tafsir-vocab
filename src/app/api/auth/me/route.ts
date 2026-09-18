import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/session";

export async function GET() {
  const identity = await getCurrentIdentity();
  if (!identity) return NextResponse.json({ authenticated: false });
  return NextResponse.json({
    authenticated: true,
    user: {
      id: identity.user.id,
      email: identity.user.email,
      displayName: identity.user.displayName ?? identity.user.email.split("@")[0] ?? "Learner"
    },
    progress: identity.learner ? {
      xp: identity.learner.xp,
      streakDays: identity.learner.streakDays,
      tafsirAttempts: identity.learner.tafsirAttempts,
      tafsirSuccessful: identity.learner.tafsirSuccessful
    } : null
  });
}
