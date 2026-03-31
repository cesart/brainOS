import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const authSecret = process.env.AUTH_SECRET;
  const cookie = request.cookies.get("brain-auth")?.value;
  const isAuth = !!authSecret && cookie === authSecret;

  if (isAuth) return NextResponse.next();

  // Unauthenticated: allow through but tag as demo mode so page + API routes
  // can return ephemeral data without touching Airtable.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-demo-mode", "1");
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!login|_next|icon|favicon).*)"],
};
