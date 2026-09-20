import { prisma } from "./prisma";
import { ValidationError } from "./errors";
import { members } from "./messages";
import { issueMembership } from "./member";
import { recordFeeVerdict } from "./membershipPaymentServer";
import { setMembershipStatus } from "./membershipRecord";
import { currentMembership } from "./currentMembershipServer";
import type { MembershipVerdict } from "./membershipVerdict";

export interface Decision {
  userId: string;
  status: "ACTIVE" | "REJECTED";
  rejectionReason?: string | null;
  reviewedBy: string;
}

export async function recordMembershipVerdict(decision: Decision) {
  const { userId, status } = decision;

  const account = await prisma.user.findUnique({
    where: { id: userId },
    select: { memberNumber: true },
  });
  const existing = account ? await currentMembership(prisma, userId) : null;
  const needsNumber = status === "ACTIVE" && !account?.memberNumber;

  await prisma.$transaction(async (tx) => {
    if (!account || !existing) throw new ValidationError(members.notFound);
    const issued = needsNumber ? await issueMembership(tx) : undefined;
    const verdict: MembershipVerdict = {
      status,
      rejectionReason: status === "REJECTED" ? decision.rejectionReason || null : null,
      reviewedBy: decision.reviewedBy,
    };
    await recordFeeVerdict(tx, userId, existing.year, verdict, new Date());
    await setMembershipStatus(tx, userId, existing.year, verdict);
    if (issued) await tx.user.update({ where: { id: userId }, data: issued });
  });

  const person = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { fullName: true, memberNumber: true },
  });

  return {
    person,
    before: { status: existing?.status, memberNumber: account?.memberNumber ?? null },
  };
}
