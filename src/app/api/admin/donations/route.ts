import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { donationMirrorOf, mirrorDonation } from "@/lib/paymentMirror";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { donationCreateSchema } from "./schema";
import { resolveDonationActivity } from "@/lib/donationActivity";
import { members } from "@/lib/messages";

export const POST = withRoute("POST /api/admin/donations", async (req: NextRequest) => {
  const session = await requireAdminRole("SUPER");
  const { donorName, donorPhone, amount, proof, donorPhoto, paymentMethod, activityId, userId } =
    parse(donationCreateSchema, await req.json());

  const giver = userId
    ? await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
    : null;
  if (userId && !giver) return NextResponse.json({ error: members.notFound }, { status: 404 });

  const donation = await prisma.donation.create({
    data: {
      anonymous: false,
      donorName,
      donorPhone: donorPhone ?? null,
      amount,
      proof: proof ?? null,
      donorPhoto: donorPhoto ?? null,
      paymentMethod: paymentMethod || null,
      activityId: await resolveDonationActivity(activityId),
      userId: giver?.id ?? null,
      source: giver ? "SELF" : "PUBLIC",
      status: "ACTIVE",
    },
  });
  await mirrorDonation(prisma, donationMirrorOf(donation));
  await logAction(session.username, "CREATE_DONATION_MANUAL", `${donorName} — ${amount} أوقية`, {
    ...auditContext(session, req),
    targetType: "Donation",
    targetId: donation.id,
    after: {
      donorName: donation.donorName,
      donorPhone: donation.donorPhone,
      amount: donation.amount,
      paymentMethod: donation.paymentMethod,
      status: donation.status,
      source: donation.source,
      userId: donation.userId,
    },
  });

  return NextResponse.json({ donation }, { status: 201 });
});
