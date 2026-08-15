import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not set");
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

const USER_PROTECTED = ["/home", "/profile"];
const ADMIN_PROTECTED = ["/admin/dashboard"];

// So the user lands back where they were after signing back in, instead of
// a generic dashboard/home.
function loginRedirect(loginPath: string, req: NextRequest): NextResponse {
  const url = new URL(loginPath, req.url);
  url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

async function requireUserToken(req: NextRequest): Promise<NextResponse | null> {
  const token = req.cookies.get("user_token")?.value;
  if (!token) return loginRedirect("/login", req);
  try {
    await jwtVerify(token, SECRET);
    return null;
  } catch {
    return loginRedirect("/login", req);
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // User-protected routes
  if (USER_PROTECTED.some((p) => pathname.startsWith(p))) {
    const denied = await requireUserToken(req);
    if (denied) return denied;
  }

  // /form itself is open to anonymous visitors — new registrations create
  // their account partway through it (step 2). Editing an existing
  // submission (?id=...) still needs a session, since it reads someone's
  // member record.
  if (pathname.startsWith("/form") && req.nextUrl.searchParams.has("id")) {
    const denied = await requireUserToken(req);
    if (denied) return denied;
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
  matcher: ["/home/:path*", "/profile/:path*", "/form/:path*", "/admin/dashboard/:path*"],
};
