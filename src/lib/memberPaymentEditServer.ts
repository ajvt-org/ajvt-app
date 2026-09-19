import { prisma } from "@/lib/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { members as messages } from "@/lib/messages";
import { getAppSettings } from "@/lib/settingsServer";
import { recordMembershipPayment, totalPaidFor } from "@/lib/membershipPaymentServer";
import { currentMembershipPaid } from "@/lib/currentMembershipServer";
import { amountConsequence } from "@/lib/membershipShortfall";
import { endMembership, restoreMembership } from "@/lib/membershipEndingServer";
import { AMOUNT_BELOW_FEE } from "@/lib/texts";
import { accountIdError } from "@/lib/paymentAccountsServer";
import { PERSON_NAME_SELECT } from "@/lib/person";
import { releaseUploads } from "@/lib/uploadRelease";
import {
  amountAfterEdit,
  feeAfterEdit,
  methodAfterEdit,
  touchesPayment,
} from "@/lib/membershipFeeEdit";

export interface PaymentEdit {
  amountTransferred?: number;
  paymentMethod?: string;
  accountId?: string | null;
  paymentProof?: string | null;
  bankReference?: string | null;
  paidOn?: unknown;
  membershipDecision?: string;
}

export async function editMemberPayment(id: string, input: PaymentEdit, by: string) {
  const { membershipDecision, ...edit } = input;
  const { membershipFee } = await getAppSettings();

  const account = await prisma.user.findUnique({ where: { id }, select: PERSON_NAME_SELECT });
  if (!account) throw new NotFoundError(messages.notFound);
  const current = await currentMembershipPaid(prisma, id);
  if (!current) throw new NotFoundError(messages.notFound);

  const feeApplied = current.feeApplied ?? membershipFee;
  const consequence =
    edit.amountTransferred === undefined
      ? null
      : amountConsequence(edit.amountTransferred, feeApplied, current);
  if (consequence === "endable" && membershipDecision !== "end") {
    throw new ValidationError(messages.shortfallNeedsDecision);
  }
  const ends = consequence === "endable";
  const restores = consequence === "restorable" && membershipDecision === "restore";

  const wrongAccount = await accountIdError(
    methodAfterEdit(edit, current),
    edit.accountId,
    current.accountId,
  );
  if (wrongAccount) throw new ValidationError(wrongAccount);

  const before = await totalPaidFor(prisma, id);
  const ending = { reason: AMOUNT_BELOW_FEE, by, at: new Date() };

  await prisma.$transaction(async (tx) => {
    if (touchesPayment(edit)) {
      await recordMembershipPayment(
        tx,
        id,
        amountAfterEdit(edit, before),
        feeApplied,
        feeAfterEdit(edit, current),
      );
    }
    if (ends) await endMembership(tx, id, current.year, ending);
    if (restores) await restoreMembership(tx, id, current.year);
  });

  await releaseUploads(current.paymentProof);

  return {
    person: account,
    membership: current,
    ending,
    ends,
    restores,
    before: { amountTransferred: before, paymentProof: current.paymentProof },
    after: {
      amountTransferred: edit.amountTransferred === undefined ? before : edit.amountTransferred,
      paymentProof: edit.paymentProof === undefined ? current.paymentProof : edit.paymentProof,
    },
    amountTransferred: await totalPaidFor(prisma, id),
  };
}
