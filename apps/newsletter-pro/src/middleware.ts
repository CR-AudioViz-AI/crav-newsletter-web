import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const res = NextResponse.next();

  if (process.env.APP_MODE !== "prod") {
    res.headers.delete("X-Frame-Options");
    res.headers.set("Content-Security-Policy", "frame-ancestors *");
  }

  return res;
}

export const config = { 
  matcher: ["/:path*"] 
};
