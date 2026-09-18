import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE, hashSessionToken, LEARNER_COOKIE, secureCookieOptions } from "@/lib/session";

export async function POST() {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;
  if (token) await prisma.authSession.deleteMany({ where: { tokenHash: hashSessionToken(token) } });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, "", { ...secureCookieOptions, maxAge: 0, expires: new Date(0) });
  response.cookies.set(LEARNER_COOKIE, randomUUID(), { ...secureCookieOptions, maxAge: 60 * 60 * 24 * 365 });
  return response;
}
