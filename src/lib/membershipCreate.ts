import type { Prisma, PrismaClient } from "@prisma/client";
import { recordMembershipYear, saveMembershipYear } from "./membershipRecord";
import { recordMembershipPayment } from "./membershipPaymentServer";

type Db = PrismaClient | Prisma.TransactionClient;

export interface NewMembership {
  userId: string;
  paymentMethod: string;
  paymentProof: string | null;
  paidAmount: number | null;
  surplusAnonymous: boolean;
  status: "PENDING" | "ACTIVE";
  membershipYear: number;
  fee: number;
  recordedBy: string;
  issued?: { memberNumber: string; verifyToken: string };
}

export async function addMembership(db: Db, m: NewMembership) {
  const member = await db.member.create({ data: { userId: m.userId } });

  await saveMembershipYear(db, m.userId, m.membershipYear, {
    status: m.status,
    paymentMethod: m.paymentMethod,
    paymentProof: m.paymentProof,
  });

  await recordMembershipPayment(db, member.id, m.paidAmount, m.fee, m.surplusAnonymous);

  if (m.status === "ACTIVE") {
    await recordMembershipYear(db, m.userId, m.membershipYear, m.fee, {
      paymentMethod: m.paymentMethod,
      paymentProof: m.paymentProof,
      recordedBy: m.recordedBy,
    });
    if (m.issued) {
      await db.user.update({ where: { id: m.userId }, data: m.issued });
    }
  }

  return member;
}
