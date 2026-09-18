import { NextRequest, NextResponse } from "next/server";

const LEARNER_COOKIE = "tv_learner";

export function middleware(request: NextRequest) {
  const current = request.cookies.get(LEARNER_COOKIE)?.value;
  if (!current || !/^[0-9a-f-]{36}$/i.test(current)) {
    const anonymousId = crypto.randomUUID();
    request.cookies.set(LEARNER_COOKIE, anonymousId);
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("cookie", request.cookies.toString());
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.cookies.set(LEARNER_COOKIE, anonymousId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/"
    });
    return response;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
