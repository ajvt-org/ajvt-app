import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export async function accountOf(db: Db, memberId: string): Promise<string> {
  const member = await db.member.findUniqueOrThrow({
    where: { id: memberId },
    select: { userId: true },
  });
  return member.userId;
}

export async function memberOf(db: Db, userId: string): Promise<string> {
  const member = await db.member.findUniqueOrThrow({
    where: { userId },
    select: { id: true },
  });
  return member.id;
}

export async function accountsFor(db: Db, memberIds: string[]): Promise<Map<string, string>> {
  const ids = [...new Set(memberIds)];
  if (ids.length === 0) return new Map();
  const rows = await db.member.findMany({
    where: { id: { in: ids } },
    select: { id: true, userId: true },
  });
  return new Map(rows.map((r) => [r.id, r.userId]));
}
