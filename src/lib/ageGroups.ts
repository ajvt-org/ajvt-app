import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";

type Db = PrismaClient | Prisma.TransactionClient;

export function renameMemberAge(from: string, to: string) {
  return prisma.$executeRaw`UPDATE "User" SET "age" = ${to} WHERE "age" = ${from}`;
}

export async function suggestAgeGroup(db: Db, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  await db.ageGroup.upsert({
    where: { name: trimmed },
    update: {},
    create: { name: trimmed, approved: false },
  });
}
