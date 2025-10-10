import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  if (process.env.NODE_ENV !== "production") {
    res.headers.set(
      "Content-Security-Policy",
      [
        "default-src 'self' blob: data: https: http:",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: data: https: http:",
        "style-src 'self' 'unsafe-inline' https: http:",
        "img-src 'self' blob: data: https: http:",
        "font-src 'self' data: https: http:",
        "connect-src 'self' blob: data: ws: wss: https: http:",
        "frame-ancestors *"
      ].join("; ")
    );
    res.headers.set("X-Frame-Options", "ALLOWALL");
    res.headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
    res.headers.set("Cross-Origin-Embedder-Policy", "unsafe-none");
  }
  
  res.headers.set("X-Forwarded-Proto", req.nextUrl.protocol.replace(":", ""));
  return res;
}

export const config = { 
  matcher: ["/:path*"] 
};
