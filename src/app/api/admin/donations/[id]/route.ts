import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { donationMirrorOf, mirrorDonation, removeMirroredDonation } from "@/lib/paymentMirror";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { donationUpdateSchema } from "./schema";
import type { ReviewStatus } from "@prisma/client";
import { members, money } from "@/lib/messages";
import { ouguiya } from "@/lib/texts";
import { resolveDonationActivity } from "@/lib/donationActivity";
import { DONOR_ACCOUNT_SELECT, donorNameOnRecord } from "@/lib/donorName";
import { viewerOf } from "@/lib/supportViewer";
import { donationView } from "@/lib/donationView";
import type { SupportViewer } from "@/lib/supportPrivacy";

async function namedAccount(userId: string | null, viewer: SupportViewer): Promise<string | null> {
  if (!userId) return null;
  const account = await prisma.user.findUnique({
    where: { id: userId },
    select: DONOR_ACCOUNT_SELECT,
  });
  return account ? donorNameOnRecord({ donorName: null, userId, user: account }, viewer) : null;
}

export const PATCH = withRoute(
  "PATCH /api/admin/donations/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("SUPER");
    const viewer = viewerOf(session);
    const { id } = await params;
    const {
      status,
      userId,
      anonymous,
      donorName,
      donorPhone,
      donorPhoto,
      amount,
      paymentMethod,
      proof,
      tagIds,
      activityId,
    } = parse(donationUpdateSchema, await req.json());

    const existing = await prisma.donation.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: money.donationNotFound }, { status: 404 });
    }
    if (
      existing.source === "MEMBERSHIP" &&
      [
        status,
        userId,
        anonymous,
        donorName,
        donorPhone,
        donorPhoto,
        amount,
        proof,
        paymentMethod,
        tagIds,
        activityId,
      ].some((v) => v !== undefined)
    ) {
      return NextResponse.json({ error: money.membershipDonationReadOnly }, { status: 400 });
    }

    const data: {
      status?: ReviewStatus;
      anonymous?: boolean;
      donorName?: string | null;
      donorPhone?: string | null;
      donorPhoto?: string | null;
      amount?: number;
      paymentMethod?: string | null;
      proof?: string | null;
      tags?: { set: { id: string }[] };
      activityId?: string | null;
      userId?: string | null;
    } = {};
    if (status !== undefined) data.status = status;

    if (userId !== undefined) {
      const giver = userId
        ? await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
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
    if (paymentMethod !== undefined) data.paymentMethod = paymentMethod;

    if (tagIds !== undefined) {
      data.tags = { set: tagIds.map((tagId) => ({ id: tagId })) };
    }
    if (activityId !== undefined) data.activityId = await resolveDonationActivity(activityId);

    const donation = await prisma.donation.update({
      where: { id },
      data,
      include: { user: { select: DONOR_ACCOUNT_SELECT } },
    });
    await mirrorDonation(prisma, donationMirrorOf(donation, tagIds));

    const target = {
      ...auditContext(session, req),
      targetType: "Donation",
      targetId: donation.id,
    };

    if (status !== undefined) {
      await logAction(
        session.username,
        status === "ACTIVE" ? "APPROVE_DONATION" : "REJECT_DONATION",
        donorNameOnRecord(
          { donorName: existing.donorName, userId: donation.userId, user: donation.user },
          viewer,
        ),
        { ...target, before: { status: existing.status }, after: { status: donation.status } },
      );
    }
    if (userId !== undefined) {
      const wasNamed = await namedAccount(existing.userId, viewer);
      const nowNamed = userId ? donorNameOnRecord(donation, viewer) : null;
      const typed = donorNameOnRecord(
        { donorName: existing.donorName, userId: donation.userId, user: donation.user },
        viewer,
      );
      await logAction(
        session.username,
        userId ? "LINK_DONATION_MEMBER" : "UNLINK_DONATION_MEMBER",
        nowNamed ? `${wasNamed ?? typed} → ${nowNamed}` : (wasNamed ?? typed),
        {
          ...target,
          before: { userId: existing.userId },
          after: { userId: donation.userId },
        },
      );
    }
    if (
      anonymous !== undefined ||
      donorName !== undefined ||
      donorPhone !== undefined ||
      donorPhoto !== undefined ||
      amount !== undefined ||
      paymentMethod !== undefined ||
      proof !== undefined
    ) {
      await logAction(session.username, "UPDATE_DONATION", donorNameOnRecord(donation, viewer), {
        ...target,
        before: existing,
        after: {
          donorName: donation.donorName,
          donorPhone: donation.donorPhone,
          donorPhoto: donation.donorPhoto,
          amount: donation.amount,
          paymentMethod: donation.paymentMethod,
          proof: donation.proof,
        },
      });
    }

    return NextResponse.json({ donation: donationView(donation, viewer) });
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/donations/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("SUPER");
    const viewer = viewerOf(session);
    const { id } = await params;

    const existing = await prisma.donation.findUnique({
      where: { id },
      include: { user: { select: DONOR_ACCOUNT_SELECT } },
    });
    if (!existing) {
      return NextResponse.json({ error: money.donationNotFound }, { status: 404 });
    }
    if (existing.source === "MEMBERSHIP") {
      return NextResponse.json({ error: money.membershipDonationReadOnly }, { status: 400 });
    }

    await prisma.donation.delete({ where: { id } });
    await removeMirroredDonation(prisma, id);
    await logAction(
      session.username,
      "DELETE_DONATION",
      `${donorNameOnRecord(
        { donorName: existing.donorName, userId: existing.userId, user: existing.user },
        viewer,
      )} — ${ouguiya.amount(existing.amount ?? 0)}`,
      {
        ...auditContext(session, req),
        targetType: "Donation",
        targetId: id,
        before: existing,
      },
    );

    return NextResponse.json({ ok: true });
  },
);
