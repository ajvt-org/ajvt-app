import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export interface Ending {
  reason: string;
  by: string;
  at: Date;
}

export async function endMembership(db: Db, userId: string, year: number, ending: Ending) {
  await db.membership.updateMany({
    where: { userId, year },
    data: { endedAt: ending.at, endedReason: ending.reason, endedBy: ending.by },
  });
}

export async function restoreMembership(db: Db, userId: string, year: number) {
  await db.membership.updateMany({
    where: { userId, year },
    data: { endedAt: null, endedReason: null, endedBy: null },
  });
}
