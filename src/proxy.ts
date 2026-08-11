import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not set");
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

const USER_PROTECTED = ["/home", "/form"];
const ADMIN_PROTECTED = ["/admin/dashboard"];

// So the user lands back where they were after signing back in, instead of
// a generic dashboard/home.
function loginRedirect(loginPath: string, req: NextRequest): NextResponse {
  const url = new URL(loginPath, req.url);
  url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // User-protected routes
  if (USER_PROTECTED.some((p) => pathname.startsWith(p))) {
    const token = req.cookies.get("user_token")?.value;
    if (!token) return loginRedirect("/login", req);
    try {
      await jwtVerify(token, SECRET);
    } catch {
      return loginRedirect("/login", req);
    }
  }

  // Admin-protected routes
  if (ADMIN_PROTECTED.some((p) => pathname.startsWith(p))) {
    const token = req.cookies.get("admin_token")?.value;
    if (!token) return loginRedirect("/admin/login", req);
    try {
      await jwtVerify(token, SECRET);
    } catch {
      return loginRedirect("/admin/login", req);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/home/:path*", "/form/:path*", "/admin/dashboard/:path*"],
};
