import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export async function accountOf(db: Db, memberId: string): Promise<string> {
  const member = await db.member.findUniqueOrThrow({
    where: { id: memberId },
    select: { userId: true },
  });
  return member.userId;
}
