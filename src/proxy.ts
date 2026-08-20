import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import {
  CHANGE_PASSWORD_PATH,
  isAdminProtected,
  isProtectedForm,
  isUserProtected,
} from "@/lib/authPaths";
import { isTokenOf } from "@/lib/tokenType";

if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not set");
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

function loginRedirect(loginPath: string, req: NextRequest): NextResponse {
  const url = new URL(loginPath, req.url);
  url.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

async function requireUserToken(req: NextRequest): Promise<NextResponse | null> {
  const token = req.cookies.get("user_token")?.value;
  if (!token) return loginRedirect("/login", req);
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (!isTokenOf(payload, "user")) return loginRedirect("/login", req);
    return null;
  } catch {
    return loginRedirect("/login", req);
  }
}

async function tempPasswordRedirect(req: NextRequest): Promise<NextResponse | null> {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith(CHANGE_PASSWORD_PATH) || pathname.startsWith("/admin")) return null;

  const token = req.cookies.get("user_token")?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (!isTokenOf(payload, "user") || !payload.mustChangePassword) return null;
  } catch {
    return null;
  }

  return NextResponse.redirect(new URL(CHANGE_PASSWORD_PATH, req.url));
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const locked = await tempPasswordRedirect(req);
  if (locked) return locked;

  if (isUserProtected(pathname)) {
    const denied = await requireUserToken(req);
    if (denied) return denied;
  }

  if (isProtectedForm(pathname, req.nextUrl.searchParams)) {
    const denied = await requireUserToken(req);
    if (denied) return denied;
  }

  if (isAdminProtected(pathname)) {
    const token = req.cookies.get("admin_token")?.value;
    if (!token) return loginRedirect("/admin/login", req);
    try {
      const { payload } = await jwtVerify(token, SECRET);
      if (!isTokenOf(payload, "admin")) return loginRedirect("/admin/login", req);
    } catch {
      return loginRedirect("/admin/login", req);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/|_next/|uploads/|sw\\.js|manifest\\.json|offline\\.html|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|txt|xml|woff2?|ttf)$).*)",
  ],
};
