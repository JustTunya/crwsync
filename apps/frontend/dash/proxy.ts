import { NextResponse, NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hasSession = req.cookies.get("crw-rt") !== undefined;

  const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL!;

  if (!hasSession) {
    const target = new URL("/auth/signin", WEB_URL);
    target.searchParams.set("next", `${pathname}${search}`);
    const res = NextResponse.redirect(target);
    res.cookies.set("crw-rt", "", { path: "/auth", maxAge: 0 });
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|assets|api/webhooks).*)"
  ],
};