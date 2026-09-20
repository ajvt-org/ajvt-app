import type { PaymentPurpose, ReviewStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { ValidationError } from "./errors";
import { accountIdError } from "./paymentAccountsServer";
import { readBankReference } from "./bankReference";
import { resolveMoneyDestination } from "./moneyDestinationServer";
import { readMoneyDate } from "./paymentDate";
import { GIFT_SELECT, giftPurpose, giftRow } from "./giftPayment";
import { syncReceiptsFor } from "./paymentReceiptServer";
import { willBeLinked } from "./linkedDonor";
import { giverOrNothing } from "./giftWriteServer";

export interface GiftEdit {
  status?: ReviewStatus;
  userId?: string | null;
  anonymous?: boolean;
  donorName?: string | null;
  donorPhone?: string | null;
  donorPhoto?: string | null;
  amount?: number;
  paymentMethod?: string | null;
  accountId?: string | null;
  bankReference?: string | null;
  proof?: string | null;
  tagIds?: string[];
  activityId?: string | null;
  competitionId?: string | null;
  paidOn?: unknown;
}

interface GiftData {
  status?: ReviewStatus;
  anonymous?: boolean;
  donorName?: string | null;
  donorPhone?: string | null;
  donorPhoto?: string | null;
  amount?: number;
  method?: string | null;
  accountId?: string | null;
  bankReference?: string | null;
  proof?: string | null;
  tags?: { set: { id: string }[] };
  purpose?: PaymentPurpose;
  activityId?: string | null;
  competitionId?: string | null;
  userId?: string | null;
  paidOn?: Date | null;
}

interface HeldGift {
  userId: string | null;
  paymentMethod: string | null;
  accountId: string | null;
}

export async function updateGift(id: string, existing: HeldGift, edit: GiftEdit) {
  const data: GiftData = {};

  if (edit.status !== undefined) data.status = edit.status;

  if (edit.userId !== undefined) {
    const giver = await giverOrNothing(edit.userId);
    data.userId = giver?.id ?? null;
  }

  if (edit.anonymous !== undefined) data.anonymous = edit.anonymous;
  if (edit.donorName !== undefined) data.donorName = edit.donorName;
  if (edit.donorPhone !== undefined) data.donorPhone = edit.donorPhone;
  if (edit.donorPhoto !== undefined) data.donorPhoto = edit.donorPhoto;
  if (edit.proof !== undefined) data.proof = edit.proof;
  if (edit.amount !== undefined) data.amount = edit.amount;
  if (edit.paymentMethod !== undefined) data.method = edit.paymentMethod;
  if (edit.paidOn !== undefined) data.paidOn = readMoneyDate(edit.paidOn);
  if (edit.bankReference !== undefined) {
    data.bankReference = readBankReference(edit.bankReference) || null;
  }

  if (edit.accountId !== undefined) {
    const named = edit.paymentMethod !== undefined ? edit.paymentMethod : existing.paymentMethod;
    const wrong = await accountIdError(named, edit.accountId, existing.accountId);
    if (wrong) throw new ValidationError(wrong);
    data.accountId = edit.accountId ?? null;
  }

  if (willBeLinked(existing.userId, edit.userId)) {
    data.donorName = null;
    data.donorPhone = null;
  }

  if (edit.tagIds !== undefined) {
    data.tags = { set: edit.tagIds.map((tagId) => ({ id: tagId })) };
  }
  if (edit.activityId !== undefined || edit.competitionId !== undefined) {
    const destination = await resolveMoneyDestination({
      activityId: edit.activityId,
      competitionId: edit.competitionId,
    });
    data.purpose = giftPurpose(destination);
    data.activityId = destination.activityId;
    data.competitionId = destination.competitionId;
  }

  return giftRow(
    await prisma.$transaction(async (tx) => {
      const saved = await tx.payment.update({ where: { id }, data, select: GIFT_SELECT });
      await syncReceiptsFor(tx, { id });
      return saved;
    }),
  );
}
