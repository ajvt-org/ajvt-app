import { prisma } from "./prisma";
import { money } from "./messages";
import { daysWaiting, longestFirst, WAITING_DAYS, type WaitingRow } from "./waitingRequests";
import { latestByAccount } from "./currentMembership";

export async function waitingRequests(now = new Date(), days = WAITING_DAYS) {
  const cutoff = new Date(now.getTime() - days * 86_400_000);

  const [pending, unfinished] = await Promise.all([
    prisma.membership.findMany({
      where: { status: "PENDING", createdAt: { lte: cutoff } },
      select: {
        userId: true,
        year: true,
        createdAt: true,
        user: { select: { fullName: true } },
      },
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
      [...latestByAccount(pending).values()].map((m) =>
        asRow(m.userId, m.userId, m.user.fullName || money.anonymousDonor, m.createdAt),
      ),
    ),
    unfinished: longestFirst(unfinished.map((u) => asRow(u.id, u.id, u.phone ?? "", u.createdAt))),
  };
}
