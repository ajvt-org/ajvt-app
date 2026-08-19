import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mirrorDonation, removeMirroredDonation } from "@/lib/paymentMirror";
import { requireAdminRole } from "@/lib/auth";
import { validatePhone } from "@/lib/utils";
import { PAYMENT_METHODS } from "@/lib/donations";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { donationUpdateSchema } from "./schema";
import type { ReviewStatus } from "@prisma/client";
import { members, money } from "@/lib/messages";
import { resolveDonationActivity } from "@/lib/donationActivity";

export const PATCH = withRoute(
  "PATCH /api/admin/donations/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("SUPER");
    const { id } = await params;
    const {
      status,
      memberId,
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
      return NextResponse.json({ error: "التبرع غير موجود" }, { status: 404 });
    }
    if (
      existing.source === "MEMBERSHIP" &&
      [status, memberId, donorName, donorPhone, donorPhoto, amount, proof].some(
        (v) => v !== undefined,
      )
    ) {
      return NextResponse.json(
        { error: "هذا التبرع مُدار تلقائياً ولا يمكن تعديله يدوياً" },
        { status: 400 },
      );
    }

    const data: {
      status?: ReviewStatus;
      memberId?: string | null;
      donorName?: string | null;
      donorPhone?: string | null;
      donorPhoto?: string | null;
      amount?: number;
      paymentMethod?: string | null;
      proof?: string | null;
      tags?: { set: { id: string }[] };
      activityId?: string | null;
    } = {};
    if (status !== undefined) data.status = status;

    if (memberId !== undefined) {
      if (memberId !== null) {
        const member = await prisma.member.findUnique({
          where: { id: memberId },
          select: { id: true },
        });
        if (!member) return NextResponse.json({ error: members.notFound }, { status: 404 });
      }
      data.memberId = memberId;
    }

    if (donorName !== undefined) {
      if (donorName !== null) {
        if (!donorName.trim())
          return NextResponse.json({ error: money.nameRequired }, { status: 400 });
        if (donorName.trim().length > 50)
          return NextResponse.json({ error: money.nameTooLong }, { status: 400 });
        data.donorName = donorName.trim();
      } else {
        data.donorName = null;
      }
    }

    if (donorPhone !== undefined) {
      if (donorPhone !== null && donorPhone !== "") {
        const phoneError = validatePhone(donorPhone);
        if (phoneError) return NextResponse.json({ error: phoneError }, { status: 400 });
        data.donorPhone = donorPhone.trim();
      } else {
        data.donorPhone = null;
      }
    }

    if (donorPhoto !== undefined) {
      data.donorPhoto = donorPhoto || null;
    }

    if (proof !== undefined) {
      data.proof = proof || null;
    }

    if (amount !== undefined) {
      const n = Number(amount);
      if (!Number.isInteger(n) || n <= 0) {
        return NextResponse.json({ error: money.amountInvalid }, { status: 400 });
      }
      data.amount = n;
    }

    if (paymentMethod !== undefined) {
      if (paymentMethod !== null && !PAYMENT_METHODS.includes(paymentMethod)) {
        return NextResponse.json({ error: money.paymentMethodInvalid }, { status: 400 });
      }
      data.paymentMethod = paymentMethod;
    }

    if (tagIds !== undefined) {
      data.tags = { set: tagIds.map((tagId) => ({ id: tagId })) };
    }
    if (activityId !== undefined) data.activityId = await resolveDonationActivity(activityId);

    const donation = await prisma.donation.update({
      where: { id },
      data,
      include: { member: { select: { fullName: true } } },
    });
    await mirrorDonation(prisma, {
      donationId: donation.id,
      amount: donation.amount,
      method: donation.paymentMethod,
      proof: donation.proof,
      status: donation.status,
      donorName: donation.donorName,
      donorPhoto: donation.donorPhoto,
      donorPhone: donation.donorPhone,
      tagIds,
      memberId: donation.memberId,
      activityId: donation.activityId,
    });

    const target = {
      ...auditContext(session, req),
      targetType: "Donation",
      targetId: donation.id,
    };

    if (status !== undefined) {
      await logAction(
        session.username,
        status === "ACTIVE" ? "APPROVE_DONATION" : "REJECT_DONATION",
        donation.member?.fullName || existing.donorName || money.anonymousDonor,
        { ...target, before: { status: existing.status }, after: { status: donation.status } },
      );
    }
    if (memberId !== undefined) {
      await logAction(
        session.username,
        memberId ? "LINK_DONATION_MEMBER" : "UNLINK_DONATION_MEMBER",
        memberId
          ? `${existing.donorName || money.anonymousDonor} → ${donation.member?.fullName}`
          : existing.donorName || money.anonymousDonor,
        {
          ...target,
          before: { memberId: existing.memberId },
          after: { memberId: donation.memberId },
        },
      );
    }
    if (
      donorName !== undefined ||
      donorPhone !== undefined ||
      donorPhoto !== undefined ||
      amount !== undefined ||
      paymentMethod !== undefined ||
      proof !== undefined
    ) {
      await logAction(
        session.username,
        "UPDATE_DONATION",
        donation.member?.fullName || donation.donorName || money.anonymousDonor,
        {
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
        },
      );
    }

    return NextResponse.json({ donation });
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/donations/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("SUPER");
    const { id } = await params;

    const existing = await prisma.donation.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "التبرع غير موجود" }, { status: 404 });
    }
    if (existing.source === "MEMBERSHIP") {
      return NextResponse.json(
        { error: "هذا التبرع مُدار تلقائياً ولا يمكن حذفه يدوياً" },
        { status: 400 },
      );
    }

    await prisma.donation.delete({ where: { id } });
    await removeMirroredDonation(prisma, id);
    await logAction(
      session.username,
      "DELETE_DONATION",
      `${existing.donorName || money.anonymousDonor} — ${existing.amount ?? 0} أوقية`,
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
