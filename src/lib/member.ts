import { randomInt } from "crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";
import { generateVerifyToken } from "./verifyToken";

type Db = PrismaClient | Prisma.TransactionClient;

export async function issueMembership(db: Db = prisma): Promise<{
  memberNumber: string;
  verifyToken: string;
}> {
  return { memberNumber: await generateMemberNumber(db), verifyToken: generateVerifyToken() };
}

export async function generateMemberNumber(db: Db = prisma): Promise<string> {
  const year = new Date().getFullYear();

  const counter = await db.counter.upsert({
    where: { id: "memberNumber" },
    update: { value: { increment: 1 } },
    create: { id: "memberNumber", value: 1 },
  });
  const seq = String(counter.value).padStart(4, "0");
  return `AJVT-${year}-${seq}`;
}

export function generateTempPassword(): string {
  return String(randomInt(100000, 1000000));
}
