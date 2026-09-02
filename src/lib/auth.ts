import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { HttpError, UnauthorizedError, ForbiddenError } from "./errors";
import { isTokenOf } from "./tokenType";
import { auth } from "./messages";
import { hasFullAccess, isOwner } from "./adminRoles";
import { canOpen } from "./adminNav";

if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not set");
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export async function signToken(payload: Record<string, unknown>, expiresIn = "30d") {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
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

export async function requireAdminRole(...allowed: string[]) {
  const session = await requireAdmin();
  if (!hasFullAccess(session.role) && !allowed.includes(session.role)) {
    throw new ForbiddenError();
  }
  return session;
}

export async function requireArea(area: string) {
  const session = await requireAdmin();
  if (!canOpen(session.role, area)) throw new ForbiddenError();
  return session;
}

export async function requireOwner() {
  const session = await requireAdmin();
  if (!isOwner(session.role)) throw new ForbiddenError();
  return session;
}

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

export async function requireUser(options: { allowTempPassword?: boolean } = {}) {
  const loaded = await loadUserSession();
  if (!loaded) throw new UnauthorizedError();

  const onTempPassword = loaded.user.tempPasswordExpiresAt !== null;
  if (onTempPassword && !options.allowTempPassword) {
    throw new HttpError("PASSWORD_CHANGE_REQUIRED", 403, auth.mustChangePassword);
  }

  return { userId: loaded.userId, tokenVersion: loaded.tokenVersion, onTempPassword };
}
