import { prisma } from "./prisma";
import { ForbiddenError, NotFoundError } from "./errors";
import { members } from "./messages";
import { PERSON_SELECT, personOf } from "./person";
import { anonymousForYear, paidForYear } from "./paidBreakdown";
import { latestMembership } from "./currentMembership";
import { setSurplusVisibility } from "./membershipPaymentServer";
import { requireOwnUpload } from "./uploadOwnerServer";

const MEMBERSHIP_SELECT = {
  year: true,
  status: true,
  rejectionReason: true,
  createdAt: true,
} as const;

const PAYMENTS_SELECT = {
  where: { purpose: "MEMBERSHIP" },
  select: {
    amount: true,
    feeApplied: true,
    year: true,
    anonymous: true,
    method: true,
    accountId: true,
    bankReference: true,
    proof: true,
    referenceCode: true,
  },
} as const;

export async function ownMembership(userId: string) {
  const account = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...PERSON_SELECT,
      payments: PAYMENTS_SELECT,
      memberships: { select: MEMBERSHIP_SELECT },
    },
  });

  const current = account ? latestMembership(account.memberships) : null;
  if (!account || !current) throw new NotFoundError(members.notFound);

  const { year, ...rest } = current;
  const paid = paidForYear(account.payments, year);
  const payment = account.payments.find((row) => row.year === year);

  return {
    ...personOf(account),
    ...rest,
    paymentMethod: payment?.method ?? null,
    accountId: payment?.accountId ?? null,
    bankReference: payment?.bankReference ?? null,
    paymentProof: payment?.proof ?? null,
    referenceCode: payment?.referenceCode ?? null,
    id: userId,
    membershipYear: year,
    surplusAnonymous: anonymousForYear(account.payments, year),
    paidAmount: paid?.fee ?? null,
    supportAmount: paid?.support ?? 0,
  };
}

export interface SelfEdit {
  photo?: string | null;
  surplusAnonymous?: boolean;
}

export async function updateOwnAccount(userId: string, edit: SelfEdit) {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { photoLocked: true },
  });
  if (!existing) throw new NotFoundError(members.notFound);
  if (edit.photo !== undefined && existing.photoLocked) {
    throw new ForbiddenError(members.photoLocked);
  }
  await requireOwnUpload(edit.photo, { userId, adminId: null });

  if (edit.surplusAnonymous !== undefined) {
    await prisma.$transaction((tx) => setSurplusVisibility(tx, userId, edit.surplusAnonymous!));
  }
  if (edit.photo !== undefined) {
    await prisma.user.update({ where: { id: userId }, data: { photo: edit.photo } });
  }

  const account = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      photo: true,
      photoLocked: true,
      payments: PAYMENTS_SELECT,
      memberships: { select: { year: true } },
    },
  });
  const current = latestMembership(account.memberships);

  return {
    id: userId,
    surplusAnonymous: current ? anonymousForYear(account.payments, current.year) : false,
    photo: account.photo,
    photoLocked: account.photoLocked,
  };
}
