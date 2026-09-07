import type { Prisma, PrismaClient, ReviewStatus } from "@prisma/client";
import type { MembershipVerdict } from "./membershipVerdict";

type Db = PrismaClient | Prisma.TransactionClient;

export interface MembershipYearEdit {
  status?: ReviewStatus;
  rejectionReason?: string | null;
}

export async function saveMembershipYear(
  db: Db,
  userId: string,
  year: number,
  edit: MembershipYearEdit,
) {
  await db.membership.upsert({
    where: { userId_year: { userId, year } },
    update: edit,
    create: { userId, year, ...edit },
  });
}

export async function setMembershipStatus(
  db: Db,
  userId: string,
  year: number,
  verdict: MembershipVerdict,
) {
  await db.membership.updateMany({
    where: { userId, year },
    data: {
      status: verdict.status,
      rejectionReason: verdict.rejectionReason ?? null,
    },
  });
}
