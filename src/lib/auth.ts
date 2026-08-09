import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./prisma";

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
  return verifyToken(token);
}

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) throw new Error("UNAUTHORIZED");
  const { adminId, tokenVersion } = session as { adminId: string; tokenVersion: number };
  const admin = await prisma.admin.findUnique({ where: { id: adminId }, select: { tokenVersion: true, role: true } });
  if (!admin || admin.tokenVersion !== tokenVersion) throw new Error("UNAUTHORIZED");
  return { ...session, role: admin.role } as { adminId: string; username: string; tokenVersion: number; role: string };
}

// SUPER always passes — it's the unrestricted role. MEMBERS/ACTIVITIES admins
// are scoped to their section; other admin API routes reject them with 403.
export async function requireAdminRole(...allowed: string[]) {
  const session = await requireAdmin();
  if (session.role !== "SUPER" && !allowed.includes(session.role)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

// --- User session ---
export async function getUserSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("user_token")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireUser() {
  const session = await getUserSession();
  if (!session) throw new Error("UNAUTHORIZED");
  const { userId, tokenVersion } = session as { userId: string; tokenVersion: number };
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { tokenVersion: true } });
  if (!user || user.tokenVersion !== tokenVersion) throw new Error("UNAUTHORIZED");
  return session as { userId: string; tokenVersion: number };
}
