import type { Prisma, PrismaClient } from "@prisma/client";
import { saveMembershipYear } from "./membershipRecord";
import { recordMembershipPayment } from "./membershipPaymentServer";
import type { Recorder } from "./membershipRecorder";

type Db = PrismaClient | Prisma.TransactionClient;

export interface NewMembership {
  userId: string;
  paymentMethod: string;
  accountId: string | null;
  paymentProof: string | null;
  paidAmount: number | null;
  surplusAnonymous: boolean;
  status: "PENDING" | "ACTIVE";
  membershipYear: number;
  fee: number;
  recorder: Recorder;
  issued?: { memberNumber: string; verifyToken: string };
}

export async function addMembership(db: Db, m: NewMembership): Promise<void> {
  await saveMembershipYear(db, m.userId, m.membershipYear, { status: m.status });

  await recordMembershipPayment(db, m.userId, m.paidAmount, m.fee, {
    method: m.paymentMethod,
    accountId: m.accountId,
    proof: m.paymentProof,
    status: m.status,
    recorder: m.recorder,
    anonymous: m.surplusAnonymous,
  });

  if (m.status === "ACTIVE" && m.issued) {
    await db.user.update({ where: { id: m.userId }, data: m.issued });
  }
}
