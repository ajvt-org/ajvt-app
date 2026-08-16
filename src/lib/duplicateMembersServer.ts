import { prisma } from "@/lib/prisma";
import type { Prisma, PrismaClient } from "@prisma/client";
import { planAccount, type AccountPlan, type DuplicateMember } from "@/lib/duplicateMembers";

type Db = PrismaClient | Prisma.TransactionClient;

export type DuplicateRow = DuplicateMember & { userId: string; fullName: string };

// Reading and settling the accounts that hold more than one membership. Only
// Member rows are ever written: an account is never deleted, whatever becomes
// of the memberships on it, because the person still logs in with it and the
// membership they keep hangs off it.
export async function findDuplicateAccounts(db: Db = prisma): Promise<AccountPlan<DuplicateRow>[]> {
  const members = await db.member.findMany({
    where: { userId: { not: null } },
    select: {
      id: true,
      userId: true,
      fullName: true,
      status: true,
      createdAt: true,
      memberNumber: true,
      _count: {
        select: {
          registrations: true,
          teamMemberships: true,
          donations: true,
          matchGoals: true,
          matchBookings: true,
          mvpCandidacies: true,
          motmMatches: true,
        },
      },
    },
  });

  const byUser = new Map<string, DuplicateRow[]>();
  for (const m of members) {
    const row: DuplicateRow = {
      id: m.id,
      userId: m.userId!,
      fullName: m.fullName,
      status: m.status,
      createdAt: m.createdAt,
      memberNumber: m.memberNumber,
      ...m._count,
    };
    const rows = byUser.get(row.userId);
    if (rows) rows.push(row);
    else byUser.set(row.userId, [row]);
  }

  return [...byUser.values()].map(planAccount).filter((p) => p !== null);
}

export async function applyDuplicatePlans(
  plans: AccountPlan<DuplicateRow>[],
  db: PrismaClient = prisma,
): Promise<{ removed: number; detached: number }> {
  const remove = plans.flatMap((p) => p.remove).map((m) => m.id);
  const detach = plans.flatMap((p) => p.detach).map((m) => m.id);

  await db.$transaction([
    db.member.updateMany({ where: { id: { in: detach } }, data: { userId: null } }),
    db.member.deleteMany({ where: { id: { in: remove } } }),
  ]);

  return { removed: remove.length, detached: detach.length };
}
