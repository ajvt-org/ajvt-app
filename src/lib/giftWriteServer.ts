import { prisma } from "./prisma";
import { NotFoundError, ValidationError } from "./errors";
import { members, money } from "./messages";
import { accountIdError } from "./paymentAccountsServer";
import { readBankReference } from "./bankReference";
import { resolveMoneyDestination } from "./moneyDestinationServer";
import { readMoneyDate } from "./paymentDate";
import { GIFT_SELECT, giftPurpose, giftRow, isMembershipMoney } from "./giftPayment";
import { ensureReceiptsFor, withdrawReceiptsBeforeDelete } from "./paymentReceiptServer";
import { releaseUploads } from "./uploadRelease";
import { DONOR_ACCOUNT_SELECT, donorNameOnRecord } from "./donorName";
import type { SupportViewer } from "./supportPrivacy";

export interface NewGift {
  donorName?: string | null;
  donorPhone?: string | null;
  amount: number;
  proof?: string | null;
  donorPhoto?: string | null;
  paymentMethod?: string | null;
  accountId?: string | null;
  bankReference?: string | null;
  anonymous?: boolean;
  activityId?: string | null;
  competitionId?: string | null;
  userId?: string | null;
  paidOn?: unknown;
}

export async function loadGift(id: string) {
  const found = await prisma.payment.findUnique({ where: { id }, select: GIFT_SELECT });
  if (!found) throw new NotFoundError(money.donationNotFound);
  if (isMembershipMoney(found)) throw new ValidationError(money.membershipDonationReadOnly);
  return giftRow(found);
}

export async function giverOrNothing(userId: string | null | undefined) {
  if (!userId) return null;
  const giver = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!giver) throw new NotFoundError(members.notFound);
  return giver;
}

export async function linkedDonorName(
  userId: string | null,
  viewer: SupportViewer,
): Promise<string | null> {
  if (!userId) return null;
  const account = await prisma.user.findUnique({
    where: { id: userId },
    select: DONOR_ACCOUNT_SELECT,
  });
  return account ? donorNameOnRecord({ donorName: null, userId, user: account }, viewer) : null;
}

export async function createGift(input: NewGift) {
  const destination = await resolveMoneyDestination({
    activityId: input.activityId,
    competitionId: input.competitionId,
  });

  const wrongAccount = await accountIdError(input.paymentMethod, input.accountId, null);
  if (wrongAccount) throw new ValidationError(wrongAccount);

  const giver = await giverOrNothing(input.userId);

  return giftRow(
    await prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        select: GIFT_SELECT,
        data: {
          purpose: giftPurpose(destination),
          anonymous: input.anonymous ?? false,
          donorName: input.donorName ?? null,
          donorPhone: input.donorPhone ?? null,
          amount: input.amount,
          proof: input.proof ?? null,
          donorPhoto: input.donorPhoto ?? null,
          method: input.paymentMethod || null,
          accountId: input.accountId || null,
          bankReference: readBankReference(input.bankReference) || null,
          activityId: destination.activityId,
          competitionId: destination.competitionId,
          userId: giver?.id ?? null,
          source: giver ? "SELF" : "PUBLIC",
          status: "ACTIVE",
          paidOn: readMoneyDate(input.paidOn) ?? new Date(),
        },
      });
      await ensureReceiptsFor(tx, { id: created.id });
      return created;
    }),
  );
}

export async function removeGift(id: string) {
  const existing = await loadGift(id);

  await prisma.$transaction(async (tx) => {
    await withdrawReceiptsBeforeDelete(tx, { id });
    await tx.payment.delete({ where: { id } });
  });
  await releaseUploads(existing.proof, existing.donorPhoto);

  return existing;
}
