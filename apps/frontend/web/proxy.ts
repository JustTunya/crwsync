import { NextResponse, NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const hasSession = req.cookies.get("crw-rt") !== undefined;

  const DASH_URL = process.env.NEXT_PUBLIC_DASH_URL;

  if (hasSession) {
    if (!DASH_URL) return NextResponse.next();
    const res = NextResponse.redirect(DASH_URL);
    res.cookies.set("crw-rt", "", { path: "/auth", maxAge: 0 });
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|assets|api/webhooks).*)"
  ],
};