import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { offeredMethodNames } from "@/lib/paymentMethodsServer";
import { accountIdError } from "@/lib/paymentAccountsServer";
import { readBankReference } from "@/lib/bankReference";
import { acceptedNames } from "@/lib/paymentMethods";
import { donationUpdateSchema } from "./schema";
import type { PaymentPurpose, ReviewStatus } from "@prisma/client";
import { members, money } from "@/lib/messages";
import { resolveMoneyDestination } from "@/lib/moneyDestinationServer";
import { DONOR_ACCOUNT_SELECT, donorNameOnRecord } from "@/lib/donorName";
import { viewerOf } from "@/lib/supportViewer";
import { donationView } from "@/lib/donationView";
import { logLabelFor, logSnapshotFor } from "@/lib/auditSupport";
import { donationLogSnapshot, donationWasChanged } from "@/lib/donationChangeLog";
import { willBeLinked } from "@/lib/linkedDonor";
import type { SupportViewer } from "@/lib/supportPrivacy";
import { money as amountText } from "@/lib/money";
import { releaseUploads } from "@/lib/uploadRelease";
import { readMoneyDate } from "@/lib/paymentDate";
import { GIFT_SELECT, giftPurpose, giftRow, isMembershipMoney } from "@/lib/giftPayment";
import { syncReceiptsFor, withdrawReceiptsBeforeDelete } from "@/lib/paymentReceiptServer";

async function namedAccount(userId: string | null, viewer: SupportViewer): Promise<string | null> {
  if (!userId) return null;
  const account = await prisma.user.findUnique({
    where: { id: userId },
    select: DONOR_ACCOUNT_SELECT,
  });
  return account ? donorNameOnRecord({ donorName: null, userId, user: account }, viewer) : null;
}

function findGift(id: string) {
  return prisma.payment.findUnique({ where: { id }, select: GIFT_SELECT });
}

function refuseMembershipMoney(payment: { purpose: PaymentPurpose }): NextResponse | null {
  if (!isMembershipMoney(payment)) return null;
  return NextResponse.json({ error: money.membershipDonationReadOnly }, { status: 400 });
}

export const PATCH = withRoute(
  "PATCH /api/admin/donations/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("SUPER");
    const viewer = viewerOf(session);
    const { id } = await params;
    const found = await findGift(id);
    if (!found) {
      return NextResponse.json({ error: money.donationNotFound }, { status: 404 });
    }
    const refused = refuseMembershipMoney(found);
    if (refused) return refused;
    const existing = giftRow(found);

    const accepted = acceptedNames(await offeredMethodNames(), existing.paymentMethod);
    const {
      status,
      userId,
      anonymous,
      donorName,
      donorPhone,
      donorPhoto,
      amount,
      paymentMethod,
      accountId,
      bankReference,
      proof,
      tagIds,
      activityId,
      competitionId,
      paidOn,
    } = parse(donationUpdateSchema(accepted), await req.json());

    const data: {
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
    } = {};
    if (status !== undefined) data.status = status;

    if (userId !== undefined) {
      const giver = userId
        ? await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true },
          })
        : null;
      if (userId && !giver) return NextResponse.json({ error: members.notFound }, { status: 404 });
      data.userId = giver?.id ?? null;
    }

    if (anonymous !== undefined) data.anonymous = anonymous;
    if (donorName !== undefined) data.donorName = donorName;
    if (donorPhone !== undefined) data.donorPhone = donorPhone;
    if (donorPhoto !== undefined) data.donorPhoto = donorPhoto;
    if (proof !== undefined) data.proof = proof;
    if (amount !== undefined) data.amount = amount;
    if (paymentMethod !== undefined) data.method = paymentMethod;
    if (paidOn !== undefined) data.paidOn = readMoneyDate(paidOn);

    if (bankReference !== undefined) {
      data.bankReference = readBankReference(bankReference) || null;
    }

    if (accountId !== undefined) {
      const named = paymentMethod !== undefined ? paymentMethod : existing.paymentMethod;
      const wrong = await accountIdError(named, accountId, existing.accountId);
      if (wrong) return NextResponse.json({ error: wrong }, { status: 400 });
      data.accountId = accountId ?? null;
    }

    if (willBeLinked(existing.userId, userId)) {
      data.donorName = null;
      data.donorPhone = null;
    }

    if (tagIds !== undefined) {
      data.tags = { set: tagIds.map((tagId) => ({ id: tagId })) };
    }
    if (activityId !== undefined || competitionId !== undefined) {
      const destination = await resolveMoneyDestination({ activityId, competitionId });
      data.purpose = giftPurpose(destination);
      data.activityId = destination.activityId;
      data.competitionId = destination.competitionId;
    }

    const gift = giftRow(
      await prisma.$transaction(async (tx) => {
        const saved = await tx.payment.update({ where: { id }, data, select: GIFT_SELECT });
        await syncReceiptsFor(tx, { id });
        return saved;
      }),
    );

    const target = {
      ...auditContext(session, req),
      targetType: "Donation",
      targetId: gift.id,
    };

    if (status !== undefined) {
      await logAction(
        session.username,
        status === "ACTIVE" ? "APPROVE_DONATION" : "REJECT_DONATION",
        logLabelFor(
          gift,
          donorNameOnRecord(
            { donorName: existing.donorName, userId: gift.userId, user: gift.user },
            viewer,
          ),
        ),
        { ...target, before: { status: existing.status }, after: { status: gift.status } },
      );
    }
    if (userId !== undefined) {
      const wasNamed = await namedAccount(existing.userId, viewer);
      const nowNamed = userId ? donorNameOnRecord(gift, viewer) : null;
      const typed = donorNameOnRecord(
        { donorName: existing.donorName, userId: gift.userId, user: gift.user },
        viewer,
      );
      await logAction(
        session.username,
        userId ? "LINK_DONATION_MEMBER" : "UNLINK_DONATION_MEMBER",
        logLabelFor(gift, nowNamed ? `${wasNamed ?? typed} → ${nowNamed}` : (wasNamed ?? typed)),
        {
          ...target,
          before: logSnapshotFor(gift, {
            userId: existing.userId,
            donorName: existing.donorName,
          }),
          after: logSnapshotFor(gift, {
            userId: gift.userId,
            donorName: gift.donorName,
          }),
        },
      );
    }
    if (
      donationWasChanged({
        anonymous,
        donorName,
        donorPhone,
        donorPhoto,
        amount,
        paymentMethod,
        accountId,
        bankReference,
        proof,
      })
    ) {
      await logAction(
        session.username,
        "UPDATE_DONATION",
        logLabelFor(gift, donorNameOnRecord(gift, viewer)),
        {
          ...target,
          before: logSnapshotFor(gift, existing),
          after: logSnapshotFor(gift, donationLogSnapshot(gift)),
        },
      );
    }

    await releaseUploads(existing.proof, existing.donorPhoto);

    return NextResponse.json({ donation: donationView(gift, viewer) });
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/donations/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("SUPER");
    const viewer = viewerOf(session);
    const { id } = await params;

    const found = await findGift(id);
    if (!found) {
      return NextResponse.json({ error: money.donationNotFound }, { status: 404 });
    }
    const refused = refuseMembershipMoney(found);
    if (refused) return refused;
    const existing = giftRow(found);

    await prisma.$transaction(async (tx) => {
      await withdrawReceiptsBeforeDelete(tx, { id });
      await tx.payment.delete({ where: { id } });
    });
    await releaseUploads(existing.proof, existing.donorPhoto);
    await logAction(
      session.username,
      "DELETE_DONATION",
      logLabelFor(
        existing,
        `${donorNameOnRecord(
          { donorName: existing.donorName, userId: existing.userId, user: existing.user },
          viewer,
        )} — ${amountText(existing.amount ?? 0)}`,
      ),
      {
        ...auditContext(session, req),
        targetType: "Donation",
        targetId: id,
        before: logSnapshotFor(existing, existing),
      },
    );

    return NextResponse.json({ ok: true });
  },
);
