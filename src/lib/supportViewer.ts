import { getAdminSession, getUserSession } from "./auth";
import { prisma } from "./prisma";
import type { SupportViewer } from "./supportPrivacy";

export function viewerOf(session: { role: string; adminId?: string }): SupportViewer {
  return { role: session.role };
}

export async function currentViewer(): Promise<SupportViewer> {
  const [admin, user] = await Promise.all([adminRole(), getUserSession()]);
  const userId = user ? ((user as { userId?: string }).userId ?? null) : null;
  return { role: admin, userId };
}

async function adminRole(): Promise<string | null> {
  const session = await getAdminSession();
  if (!session) return null;
  const { adminId } = session as { adminId: string };
  const admin = await prisma.admin.findUnique({ where: { id: adminId }, select: { role: true } });
  return admin?.role ?? null;
}
