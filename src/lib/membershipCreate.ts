import type { Prisma, PrismaClient } from "@prisma/client";
import { recordMembershipYear } from "./membershipRecord";
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
  const member = await db.member.create({
    data: {
      userId: m.userId,
      paymentMethod: m.paymentMethod,
      paymentProof: m.paymentProof,
      surplusAnonymous: m.surplusAnonymous,
      status: m.status,
      membershipYear: m.membershipYear,
    },
  });

  await recordMembershipPayment(db, member.id, m.paidAmount, m.fee);

  if (m.status === "ACTIVE") {
    await recordMembershipYear(db, m.userId, member.membershipYear, m.fee, {
      paidAmount: m.paidAmount,
      paymentMethod: member.paymentMethod,
      paymentProof: member.paymentProof,
      recordedBy: m.recordedBy,
    });
    if (m.issued) {
      await db.user.update({ where: { id: m.userId }, data: m.issued });
    }
  }

  return member;
}
