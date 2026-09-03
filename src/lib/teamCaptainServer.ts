import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export async function releaseCaptain(db: Db, teamId: string, userId: string) {
  await db.team.updateMany({
    where: { id: teamId, captainUserId: userId },
    data: { captainUserId: null },
  });
}

export async function captainIsOnTheRoster(db: Db, teamId: string, userId: string) {
  const membership = await db.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
    select: { id: true },
  });
  return membership !== null;
}
