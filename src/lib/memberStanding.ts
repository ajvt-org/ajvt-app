import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { MEMBERSHIP_FEE } from "./donations";
import { nameOf } from "./person";
import { asMembershipState, latestByAccount } from "./currentMembership";
import { currentMembership } from "./currentMembershipServer";
import { holdsMembership, membershipState } from "./membershipState";
import { getAppSettings } from "./settingsServer";

const COVERS_THE_FEE = {
  status: "ACTIVE",
  purpose: "MEMBERSHIP",
  amount: { gte: MEMBERSHIP_FEE },
} satisfies Prisma.PaymentWhereInput;

export async function isPaidUpMember(userId: string): Promise<boolean> {
  const [current, { membershipYear }] = await Promise.all([
    currentMembership(prisma, userId),
    getAppSettings(),
  ]);
  if (!holdsMembership(membershipState(asMembershipState(current), membershipYear))) return false;

  const paid = await prisma.payment.findFirst({
    where: { userId, ...COVERS_THE_FEE },
    select: { id: true },
  });
  return !!paid;
}

async function standingMemberships() {
  const [rows, { membershipYear }] = await Promise.all([
    prisma.membership.findMany({
      where: { user: { payments: { some: COVERS_THE_FEE } } },
      select: {
        userId: true,
        year: true,
        status: true,
        endedAt: true,
        user: { select: { fullName: true } },
      },
      orderBy: { user: { fullName: "asc" } },
    }),
    getAppSettings(),
  ]);
  return [...latestByAccount(rows).values()].filter((row) =>
    holdsMembership(membershipState(asMembershipState(row), membershipYear)),
  );
}

export async function paidUpMembers() {
  return (await standingMemberships()).map((row) => ({
    userId: row.userId,
    fullName: nameOf(row.user),
  }));
}

export async function paidUpMemberCount(): Promise<number> {
  return (await standingMemberships()).length;
}
