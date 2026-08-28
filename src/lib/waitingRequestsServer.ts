import { prisma } from "./prisma";
import { money } from "./messages";
import { daysWaiting, longestFirst, WAITING_DAYS, type WaitingRow } from "./waitingRequests";

export async function waitingRequests(now = new Date(), days = WAITING_DAYS) {
  const cutoff = new Date(now.getTime() - days * 86_400_000);

  const [pending, unfinished] = await Promise.all([
    prisma.member.findMany({
      where: { status: "PENDING", createdAt: { lte: cutoff } },
      select: { id: true, userId: true, fullName: true, createdAt: true },
    }),
    prisma.user.findMany({
      where: { members: { none: {} }, phone: { not: null }, createdAt: { lte: cutoff } },
      select: { id: true, phone: true, createdAt: true },
    }),
  ]);

  const asRow = (id: string, userId: string | null, name: string, since: Date): WaitingRow => ({
    id,
    userId,
    name,
    since: since.toISOString(),
    days: daysWaiting(since, now),
  });

  return {
    days,
    pending: longestFirst(
      pending.map((m) => asRow(m.id, m.userId, m.fullName || money.anonymousDonor, m.createdAt)),
    ),
    unfinished: longestFirst(unfinished.map((u) => asRow(u.id, u.id, u.phone ?? "", u.createdAt))),
  };
}
