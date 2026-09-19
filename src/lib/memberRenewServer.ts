import { prisma } from "@/lib/prisma";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { members as messages } from "@/lib/messages";
import { getAppSettings } from "@/lib/settingsServer";
import { recordMembershipPayment, totalPaidFor } from "@/lib/membershipPaymentServer";
import { adminRecorder } from "@/lib/membershipRecorder";
import { validatePaidAmount } from "@/lib/donations";
import { renewalRefusal } from "@/lib/renewal";
import { renewalRefusalMessage } from "@/lib/renewalMessages";
import { accountIdError } from "@/lib/paymentAccountsServer";
import { currentMembership } from "@/lib/currentMembershipServer";
import { PERSON_NAME_SELECT } from "@/lib/person";

export interface Renewal {
  paidAmount: unknown;
  paymentMethod: string;
  accountId?: string | null;
  paymentProof?: string | null;
}

interface Recorder {
  username: string;
  adminId: string;
}

export async function renewMembership(id: string, input: Renewal, session: Recorder) {
  const { membershipFee, membershipYear } = await getAppSettings();

  const paidAmountError = validatePaidAmount(input.paidAmount, membershipFee);
  if (paidAmountError) throw new ValidationError(paidAmountError);

  const account = await prisma.user.findUnique({
    where: { id },
    select: { memberNumber: true, ...PERSON_NAME_SELECT },
  });
  if (!account) throw new NotFoundError(messages.notFound);

  const current = await currentMembership(prisma, id);
  if (!current) throw new NotFoundError(messages.notFound);

  const refusal = renewalRefusal(
    { status: current.status, membershipYear: current.year, memberNumber: account.memberNumber },
    membershipYear,
  );
  if (refusal) throw new ConflictError(renewalRefusalMessage(refusal));

  const wrongAccount = await accountIdError(input.paymentMethod, input.accountId, null);
  if (wrongAccount) throw new ValidationError(wrongAccount);

  const before = await totalPaidFor(prisma, id);

  await prisma.$transaction(async (tx) => {
    await tx.membership.create({ data: { userId: id, year: membershipYear, status: "ACTIVE" } });
    await recordMembershipPayment(tx, id, Number(input.paidAmount), membershipFee, {
      method: input.paymentMethod,
      accountId: input.accountId || null,
      proof: input.paymentProof || null,
      status: "ACTIVE",
      recorder: adminRecorder(session),
      reviewedBy: session.username,
      reviewedAt: new Date(),
    });
  });

  return {
    person: account,
    member: { id, userId: id, membershipYear },
    before: { membershipYear: current.year, paidAmount: before },
    after: { membershipYear, paidAmount: Number(input.paidAmount) },
  };
}
