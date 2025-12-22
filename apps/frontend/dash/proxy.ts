import { NextResponse, NextRequest } from "next/server";

export async function proxy(req: NextRequest) {
  const hasSession = req.cookies.has("crw-rt") || req.cookies.has("crw-at");
  if (!hasSession) return NextResponse.next();

  const api = process.env.NEXT_PUBLIC_API_URL!;
  const res = await fetch(`${api}/auth/session`, {
    method: "POST",
    headers: { cookie: req.headers.get("cookie") || "" },
    credentials: "include",
  });

  if (!res.ok) return NextResponse.next();

  const target = new URL("/auth/signin", process.env.NEXT_PUBLIC_WEB_URL!);
  target.searchParams.set("next", `${req.nextUrl.pathname}${req.nextUrl.search}`);
  return NextResponse.redirect(target);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|assets|api/webhooks).*)"
  ],
};