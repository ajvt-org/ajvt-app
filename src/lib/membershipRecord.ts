import type { Prisma, PrismaClient } from "@prisma/client";
import { splitPayment } from "./membershipPayment";

type Db = PrismaClient | Prisma.TransactionClient;

export interface MembershipEdit {
  paidAmount?: number | null;
  paymentMethod?: string | null;
}

export function membershipEdit(data: MembershipEdit): MembershipEdit {
  const edit: MembershipEdit = {};
  if (data.paidAmount !== undefined) edit.paidAmount = data.paidAmount;
  if (data.paymentMethod !== undefined) edit.paymentMethod = data.paymentMethod;
  return edit;
}

export async function syncMembershipRecord(
  db: Db,
  memberId: string,
  year: number,
  data: MembershipEdit,
) {
  const edit = membershipEdit(data);
  if (Object.keys(edit).length === 0) return;
  await db.membership.updateMany({ where: { memberId, year }, data: edit });
}

export interface MembershipYearPayment {
  paidAmount: number | null;
  paymentMethod: string | null;
  paymentProof: string | null;
  recordedBy?: string | null;
}

export async function recordMembershipYear(
  db: Db,
  memberId: string,
  year: number,
  fee: number,
  payment: MembershipYearPayment,
) {
  const paidAmount = payment.paidAmount === null ? null : splitPayment(payment.paidAmount, fee).fee;

  await db.membership.upsert({
    where: { memberId_year: { memberId, year } },
    update: {},
    create: {
      memberId,
      year,
      paidAmount,
      paymentMethod: payment.paymentMethod,
      paymentProof: payment.paymentProof,
      recordedBy: payment.recordedBy ?? null,
    },
  });
}
