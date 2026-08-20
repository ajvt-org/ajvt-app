import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { HttpError, UnauthorizedError, ForbiddenError } from "./errors";
import { isTokenOf } from "./tokenType";
import { auth } from "./messages";

if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not set");
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function signToken(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload;
  } catch {
    return null;
  }
}

// --- Admin session ---
export async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  return isTokenOf(payload, "admin") ? payload : null;
}

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) throw new UnauthorizedError();
  const { adminId, tokenVersion } = session as { adminId: string; tokenVersion: number };
  const admin = await prisma.admin.findUnique({
    where: { id: adminId },
    select: { tokenVersion: true, role: true },
  });
  if (!admin || admin.tokenVersion !== tokenVersion) throw new UnauthorizedError();
  return { ...session, role: admin.role } as {
    adminId: string;
    username: string;
    tokenVersion: number;
    role: string;
  };
}

// SUPER always passes — it's the unrestricted role. MEMBERS/ACTIVITIES admins
// are scoped to their section; other admin API routes reject them with 403.
export async function requireAdminRole(...allowed: string[]) {
  const session = await requireAdmin();
  if (session.role !== "SUPER" && !allowed.includes(session.role)) {
    throw new ForbiddenError();
  }
  return session;
}

// --- User session ---
// A signature only proves we issued the token, not that it is still good.
// Changing a password or an admin reset raises tokenVersion, which revokes
// every older token, so the check belongs here rather than in each caller:
// a page asking "is this person signed in" was answering yes to a session
// that every API call would refuse, and drew the member bar over it.
async function loadUserSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("user_token")?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!isTokenOf(payload, "user")) return null;

  const { userId, tokenVersion } = payload as { userId?: string; tokenVersion?: number };
  if (!userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tokenVersion: true, tempPasswordExpiresAt: true },
  });
  if (!user || user.tokenVersion !== tokenVersion) return null;

  return { payload, userId, tokenVersion: user.tokenVersion, user };
}

export async function getUserSession() {
  const loaded = await loadUserSession();
  return loaded ? loaded.payload : null;
}

// The token carries a mustChangePassword claim so the proxy can redirect
// without a query, but the claim lives in the caller's cookie. This is the
// check that decides, and it reads the column every time.
export async function requireUser(options: { allowTempPassword?: boolean } = {}) {
  const loaded = await loadUserSession();
  if (!loaded) throw new UnauthorizedError();

  const onTempPassword = loaded.user.tempPasswordExpiresAt !== null;
  if (onTempPassword && !options.allowTempPassword) {
    throw new HttpError("PASSWORD_CHANGE_REQUIRED", 403, auth.mustChangePassword);
  }

  return { userId: loaded.userId, tokenVersion: loaded.tokenVersion, onTempPassword };
}
