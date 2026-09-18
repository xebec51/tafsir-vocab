import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { clearLoginAttempts, consumeLoginAttempt, createAuthSession, loginRateLimitKey, mergeAnonymousProgress, normalizeEmail } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE, LEARNER_COOKIE, secureCookieOptions, SESSION_MAX_AGE_SECONDS } from "@/lib/session";

const Body = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128)
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });

  const rateLimitKey = loginRateLimitKey(parsed.data.email, request.headers.get("x-forwarded-for"));
  if (!await consumeLoginAttempt(rateLimitKey)) {
    return NextResponse.json({ error: "Too many sign-in attempts. Try again in 15 minutes." }, { status: 429, headers: { "Retry-After": "900" } });
  }

  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(parsed.data.email) } });
  if (!user || !await verifyPassword(parsed.data.password, user.passwordHash)) {
    return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  }
  await clearLoginAttempts(rateLimitKey);

  const store = await cookies();
  const anonymousLearnerId = store.get(LEARNER_COOKIE)?.value;
  const displayName = user.displayName ?? user.email.split("@")[0] ?? "Learner";
  await mergeAnonymousProgress(user.id, anonymousLearnerId, displayName);
  const session = await createAuthSession(user.id);
  const response = NextResponse.json({ user: { id: user.id, email: user.email, displayName } });
  response.cookies.set(AUTH_COOKIE, session.token, { ...secureCookieOptions, maxAge: SESSION_MAX_AGE_SECONDS, expires: session.expiresAt });
  return response;
}
