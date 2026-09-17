import { NextRequest, NextResponse } from "next/server";

const LEARNER_COOKIE = "tv_learner";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  if (!request.cookies.get(LEARNER_COOKIE)?.value) {
    response.cookies.set(LEARNER_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/"
    });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
