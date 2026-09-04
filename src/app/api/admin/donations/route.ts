import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { donationMirrorOf, mirrorDonation } from "@/lib/paymentMirror";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { offeredMethodNames } from "@/lib/paymentMethodsServer";
import { donationCreateSchema } from "./schema";
import { resolveMoneyDestination } from "@/lib/moneyDestinationServer";
import { members } from "@/lib/messages";
import { donationView } from "@/lib/donationView";
import { logLabelFor, logSnapshotFor } from "@/lib/auditSupport";
import { viewerOf } from "@/lib/supportViewer";
import { DONOR_ACCOUNT_SELECT } from "@/lib/donorName";
import { money } from "@/lib/money";

export const POST = withRoute("POST /api/admin/donations", async (req: NextRequest) => {
  const session = await requireAdminRole("SUPER");
  const {
    donorName,
    donorPhone,
    amount,
    proof,
    donorPhoto,
    paymentMethod,
    activityId,
    competitionId,
    userId,
  } = parse(donationCreateSchema(await offeredMethodNames()), await req.json());
  const destination = await resolveMoneyDestination({ activityId, competitionId });

  const giver = userId
    ? await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
    : null;
  if (userId && !giver) return NextResponse.json({ error: members.notFound }, { status: 404 });

  const donation = await prisma.donation.create({
    include: { user: { select: DONOR_ACCOUNT_SELECT } },
    data: {
      anonymous: false,
      donorName,
      donorPhone: donorPhone ?? null,
      amount,
      proof: proof ?? null,
      donorPhoto: donorPhoto ?? null,
      paymentMethod: paymentMethod || null,
      activityId: destination.activityId,
      competitionId: destination.competitionId,
      userId: giver?.id ?? null,
      source: giver ? "SELF" : "PUBLIC",
      status: "ACTIVE",
    },
  });
  await mirrorDonation(prisma, donationMirrorOf(donation));
  await logAction(
    session.username,
    "CREATE_DONATION_MANUAL",
    logLabelFor(donation, `${donorName} — ${money(amount)}`),
    {
      ...auditContext(session, req),
      targetType: "Donation",
      targetId: donation.id,
      after: logSnapshotFor(donation, {
        donorName: donation.donorName,
        donorPhone: donation.donorPhone,
        amount: donation.amount,
        paymentMethod: donation.paymentMethod,
        status: donation.status,
        source: donation.source,
        userId: donation.userId,
      }),
    },
  );

  return NextResponse.json(
    { donation: donationView(donation, viewerOf(session)) },
    { status: 201 },
  );
});
