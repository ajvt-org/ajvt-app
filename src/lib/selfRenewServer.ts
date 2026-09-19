import { prisma } from "./prisma";
import { ConflictError, NotFoundError, ValidationError } from "./errors";
import { members, money } from "./messages";
import { recordMembershipPayment } from "./membershipPaymentServer";
import { selfRecorder } from "./membershipRecorder";
import { currentMembership } from "./currentMembershipServer";
import { renewalRefusal } from "./renewal";
import { renewalRefusalMessage } from "./renewalMessages";
import { accountIsOpenOn } from "./paymentMethods";
import { readBankReference } from "./bankReference";
import { nameOf } from "./person";
import type { MembershipSettings } from "./selfMembershipServer";

export interface Renewal {
  paymentMethod: string;
  accountId?: string | null;
  bankReference?: string | null;
  paymentProof: string;
  paidAmount: unknown;
  surplusAnonymous?: boolean;
}

export async function renewOwnMembership(
  userId: string,
  input: Renewal,
  settings: MembershipSettings,
) {
  const { membershipFee, membershipYear } = settings;
  const chosen = settings.payable.find((method) => method.name === input.paymentMethod);
  if (input.accountId && !accountIsOpenOn(chosen, input.accountId)) {
    throw new ValidationError(money.paymentAccountInvalid);
  }

  const account = await prisma.user.findUnique({
    where: { id: userId },
    select: { fullName: true, memberNumber: true },
  });
  if (!account) throw new NotFoundError(members.notFound);

  const current = await currentMembership(prisma, userId);
  if (!current) throw new NotFoundError(members.notFound);

  const refusal = renewalRefusal(
    { status: current.status, membershipYear: current.year, memberNumber: account.memberNumber },
    membershipYear,
  );
  if (refusal) throw new ConflictError(renewalRefusalMessage(refusal));

  await prisma.$transaction(async (tx) => {
    await tx.membership.create({
      data: { userId, year: membershipYear, status: "PENDING" },
    });
    await recordMembershipPayment(tx, userId, Number(input.paidAmount), membershipFee, {
      method: input.paymentMethod,
      accountId: input.accountId || null,
      bankReference: readBankReference(input.bankReference) || null,
      proof: input.paymentProof,
      status: "PENDING",
      recorder: selfRecorder(nameOf(account)),
      anonymous: input.surplusAnonymous,
    });
  });

  return { account, before: current.year, membershipYear };
}
