import { prisma } from "./prisma";
import { requireAdmin } from "./auth";
import { ForbiddenError, NotFoundError } from "./errors";
import { allowsActivity, isScopedRole, seesEveryActivity } from "./activityAccess";
import { activities as messages } from "./messages";

export interface AdminSession {
  adminId: string;
  username: string;
  tokenVersion: number;
  role: string;
}

async function isAttached(adminId: string, activityId: string): Promise<boolean> {
  const link = await prisma.adminActivity.findUnique({
    where: { adminId_activityId: { adminId, activityId } },
  });
  return !!link;
}

export async function requireUnscopedAdmin(): Promise<AdminSession> {
  const session = await requireAdmin();
  if (isScopedRole(session.role)) throw new ForbiddenError();
  return session;
}

export async function requireActivityAccess(activityId: string): Promise<AdminSession> {
  const session = await requireAdmin();

  if (seesEveryActivity(session.role)) return session;

  const attached = isScopedRole(session.role)
    ? await isAttached(session.adminId, activityId)
    : false;

  if (!allowsActivity(session.role, attached)) throw new ForbiddenError();
  return session;
}

export async function requireActivityFinanceAccess(activityId: string): Promise<AdminSession> {
  const session = await requireAdmin();
  if (session.role === "SUPER") return session;
  if (isScopedRole(session.role) && (await isAttached(session.adminId, activityId))) {
    return session;
  }
  throw new ForbiddenError();
}

export async function scopedActivityIds(session: AdminSession): Promise<string[] | null> {
  if (!isScopedRole(session.role)) return null;
  const links = await prisma.adminActivity.findMany({
    where: { adminId: session.adminId },
    select: { activityId: true },
  });
  return links.map((l) => l.activityId);
}

export async function requireMatchAccess(matchId: string): Promise<AdminSession> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { activityId: true },
  });
  if (!match) throw new NotFoundError(messages.notFound);
  return requireActivityAccess(match.activityId);
}

export async function requireTeamAccess(teamId: string): Promise<AdminSession> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { activityId: true },
  });
  if (!team) throw new NotFoundError(messages.notFound);
  return requireActivityAccess(team.activityId);
}

export async function requireGroupAccess(groupId: string): Promise<AdminSession> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { activityId: true },
  });
  if (!group) throw new NotFoundError(messages.notFound);
  return requireActivityAccess(group.activityId);
}

export async function requireBookingAccess(bookingId: string): Promise<AdminSession> {
  const booking = await prisma.matchBooking.findUnique({
    where: { id: bookingId },
    select: { match: { select: { activityId: true } } },
  });
  if (!booking) throw new NotFoundError(messages.notFound);
  return requireActivityAccess(booking.match.activityId);
}
