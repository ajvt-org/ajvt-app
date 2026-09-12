import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { offeredMethodNames } from "@/lib/paymentMethodsServer";
import { accountIdError } from "@/lib/paymentAccountsServer";
import { readBankReference } from "@/lib/bankReference";
import { donationCreateSchema } from "./schema";
import { resolveMoneyDestination } from "@/lib/moneyDestinationServer";
import { members } from "@/lib/messages";
import { donationView } from "@/lib/donationView";
import { logLabelFor, logSnapshotFor } from "@/lib/auditSupport";
import { viewerOf } from "@/lib/supportViewer";
import { donorNameOnRecord } from "@/lib/donorName";
import { GIFT_SELECT, giftPurpose, giftRow } from "@/lib/giftPayment";
import { ensureReceiptsFor } from "@/lib/paymentReceiptServer";
import { money } from "@/lib/money";
import { readMoneyDate } from "@/lib/paymentDate";

export const POST = withRoute("POST /api/admin/donations", async (req: NextRequest) => {
  const session = await requireAdminRole("SUPER");
  const viewer = viewerOf(session);
  const {
    donorName,
    donorPhone,
    amount,
    proof,
    donorPhoto,
    paymentMethod,
    accountId,
    bankReference,
    anonymous,
    activityId,
    competitionId,
    userId,
    paidOn,
  } = parse(donationCreateSchema(await offeredMethodNames()), await req.json());
  const destination = await resolveMoneyDestination({ activityId, competitionId });

  const wrongAccount = await accountIdError(paymentMethod, accountId, null);
  if (wrongAccount) return NextResponse.json({ error: wrongAccount }, { status: 400 });

  const giver = userId
    ? await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
    : null;
  if (userId && !giver) return NextResponse.json({ error: members.notFound }, { status: 404 });

  const madeOn = readMoneyDate(paidOn) ?? new Date();
  const gift = giftRow(
    await prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        select: GIFT_SELECT,
        data: {
          purpose: giftPurpose(destination),
          anonymous: anonymous ?? false,
          donorName: donorName ?? null,
          donorPhone: donorPhone ?? null,
          amount,
          proof: proof ?? null,
          donorPhoto: donorPhoto ?? null,
          method: paymentMethod || null,
          accountId: accountId || null,
          bankReference: readBankReference(bankReference) || null,
          activityId: destination.activityId,
          competitionId: destination.competitionId,
          userId: giver?.id ?? null,
          source: giver ? "SELF" : "PUBLIC",
          status: "ACTIVE",
          paidOn: madeOn,
        },
      });
      await ensureReceiptsFor(tx, { id: created.id });
      return created;
    }),
  );

  await logAction(
    session.username,
    "CREATE_DONATION_MANUAL",
    logLabelFor(gift, `${donorNameOnRecord(gift, viewer)} — ${money(amount)}`),
    {
      ...auditContext(session, req),
      targetType: "Donation",
      targetId: gift.id,
      after: logSnapshotFor(gift, {
        anonymous: gift.anonymous,
        donorName: gift.donorName,
        donorPhone: gift.donorPhone,
        amount: gift.amount,
        paymentMethod: gift.paymentMethod,
        accountId: gift.accountId,
        bankReference: gift.bankReference,
        status: gift.status,
        source: gift.source,
        userId: gift.userId,
      }),
    },
  );

  return NextResponse.json({ donation: donationView(gift, viewer) }, { status: 201 });
});
