import { NextResponse, NextRequest } from "next/server";

const PROTECTED = ["/dash"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const hasSession = req.cookies.get("crw-rt") !== undefined;

  const isProtected = PROTECTED.some((path) => pathname.startsWith(path));
  const isAuthPage = pathname.startsWith("/auth");

  if (isProtected && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/signin";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/dash";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|assets|api/webhooks).*)"
  ],
};