import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not set");
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

const USER_PROTECTED = ["/home", "/profile", "/change-password"];
const ADMIN_PROTECTED = ["/admin/dashboard"];
const CHANGE_PASSWORD_PATH = "/change-password";

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

// A temporary password gets you exactly one screen. The claim is read from the
// token rather than the database because middleware has no database, so this is
// only the redirect: requireUser rejects every API call for the same reason,
// and that check is the one that decides.
//
// /admin is left alone because an admin session is a different cookie, and the
// change form itself has to stay reachable or there is no way out of the lock.
async function tempPasswordRedirect(req: NextRequest): Promise<NextResponse | null> {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith(CHANGE_PASSWORD_PATH) || pathname.startsWith("/admin")) return null;

  const token = req.cookies.get("user_token")?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (!payload.mustChangePassword) return null;
  } catch {
    return null;
  }

  return NextResponse.redirect(new URL(CHANGE_PASSWORD_PATH, req.url));
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const locked = await tempPasswordRedirect(req);
  if (locked) return locked;

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

// Every page, because a temporary password locks the whole app and not just the
// member area. API routes are excluded: requireUser already refuses them, and a
// redirect is no answer to fetch. Static files and the service worker are
// excluded so the shell still loads while locked.
export const config = {
  matcher: [
    "/((?!api/|_next/|uploads/|sw\\.js|manifest\\.json|offline\\.html|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|txt|xml|woff2?|ttf)$).*)",
  ],
};
