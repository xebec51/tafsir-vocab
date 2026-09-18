import { createHash, randomBytes, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const LEARNER_COOKIE = "tv_learner";
export const AUTH_COOKIE = "tv_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export const secureCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/"
};

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function newSessionToken() {
  return randomBytes(32).toString("base64url");
}

export async function getCurrentIdentity() {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;
  if (!token) return null;

  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: { include: { learner: true } } }
  });
  if (!session || session.expiresAt <= new Date()) return null;
  return { sessionId: session.id, user: session.user, learner: session.user.learner };
}

export async function getLearnerId() {
  const identity = await getCurrentIdentity();
  if (identity) {
    if (identity.learner) return identity.learner.id;
    const learner = await prisma.learner.create({
      data: {
        id: `user_${identity.user.id}`,
        userId: identity.user.id,
        displayName: identity.user.displayName ?? "Learner",
        isAnonymous: false
      }
    });
    return learner.id;
  }

  const store = await cookies();
  const anonymousId = store.get(LEARNER_COOKIE)?.value;
  return anonymousId && /^[0-9a-f-]{36}$/i.test(anonymousId) ? anonymousId : randomUUID();
}
