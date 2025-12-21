import { NextResponse, NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hasSession = req.cookies.get("crw-rt") !== undefined;

  const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL!;

  console.log("Proxy middleware:", { pathname, hasSession, WEB_URL });

  if (!hasSession) {
    const target = new URL("/auth/signin", WEB_URL);
    target.searchParams.set("next", `${WEB_URL}${pathname}${search}`);
    return NextResponse.redirect(target);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|assets|api/webhooks).*)"
  ],
};