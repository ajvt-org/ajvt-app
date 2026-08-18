import type { Prisma, PrismaClient } from "@prisma/client";

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
