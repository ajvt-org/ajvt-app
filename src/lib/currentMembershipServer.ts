import type { Prisma, PrismaClient } from "@prisma/client";
import { latestMembership } from "./currentMembership";

type Db = PrismaClient | Prisma.TransactionClient;

export const MEMBERSHIP_SELECT = {
  id: true,
  userId: true,
  year: true,
  status: true,
  rejectionReason: true,
  paymentMethod: true,
  paymentProof: true,
  referenceCode: true,
  surplusAnonymous: true,
  createdAt: true,
} as const;

export async function currentMembership(db: Db, userId: string) {
  const rows = await db.membership.findMany({ where: { userId }, select: MEMBERSHIP_SELECT });
  return latestMembership(rows);
}
