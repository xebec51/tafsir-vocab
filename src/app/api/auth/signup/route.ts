import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAuthSession, normalizeEmail } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE, LEARNER_COOKIE, secureCookieOptions, SESSION_MAX_AGE_SECONDS } from "@/lib/session";

const Body = z.object({
  displayName: z.string().trim().min(2).max(60),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128)
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid name, email, and password of at least 8 characters." }, { status: 400 });

  const email = normalizeEmail(parsed.data.email);
  const passwordHash = await hashPassword(parsed.data.password);
  const store = await cookies();
  const anonymousLearnerId = store.get(LEARNER_COOKIE)?.value;

  try {
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email, passwordHash, displayName: parsed.data.displayName }
      });
      const anonymous = anonymousLearnerId ? await tx.learner.findFirst({
        where: { id: anonymousLearnerId, userId: null, isAnonymous: true }
      }) : null;
      if (anonymous) {
        await tx.learner.update({
          where: { id: anonymous.id },
          data: { userId: created.id, displayName: parsed.data.displayName, isAnonymous: false }
        });
      } else {
        await tx.learner.create({
          data: { id: `user_${created.id}`, userId: created.id, displayName: parsed.data.displayName, isAnonymous: false }
        });
      }
      return created;
    });

    const session = await createAuthSession(user.id);
    const response = NextResponse.json({ user: { id: user.id, email: user.email, displayName: user.displayName ?? parsed.data.displayName }, progressClaimed: Boolean(anonymousLearnerId) }, { status: 201 });
    response.cookies.set(AUTH_COOKIE, session.token, { ...secureCookieOptions, maxAge: SESSION_MAX_AGE_SECONDS, expires: session.expiresAt });
    return response;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: "Unable to create the account right now." }, { status: 500 });
  }
}
