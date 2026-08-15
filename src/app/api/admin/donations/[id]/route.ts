import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { validatePhone } from "@/lib/utils";
import { PAYMENT_METHODS } from "@/lib/donations";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { donationUpdateSchema } from "./schema";
import type { ReviewStatus } from "@prisma/client";

export const PATCH = withRoute(
  "PATCH /api/admin/donations/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    // Donations are only visible to SUPER admins today (see payment-proofs'
    // includeDonations gate) — management follows the same scope: the admin
    // needs to be able to fix any real-world edge case (typo'd name, wrong
    // amount, wrong attribution, a donor who wants out) without being
    // blocked, so every editable field lives behind this one endpoint.
    const session = await requireAdminRole("SUPER");
    const { id } = await params;
    const { status, memberId, donorName, donorPhone, donorPhoto, amount, paymentMethod, proof } =
      parse(donationUpdateSchema, await req.json());

    const existing = await prisma.donation.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "التبرع غير موجود" }, { status: 404 });
    }
    // MEMBERSHIP-source rows are derived from Member.paidAmount/status/
    // paymentMethod/paymentProof and kept in sync automatically (see
    // syncMembershipDonation) — amount/name/proof edits here would be
    // silently overwritten the next time that sync runs. paymentMethod is
    // the one field it also propagates automatically going forward, but an
    // admin may still need to fix it by hand for rows synced before that
    // existed.
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
    } = {};
    if (status !== undefined) data.status = status;

    if (memberId !== undefined) {
      if (memberId !== null) {
        const member = await prisma.member.findUnique({
          where: { id: memberId },
          select: { id: true },
        });
        if (!member) return NextResponse.json({ error: "العضو غير موجود" }, { status: 404 });
      }
      data.memberId = memberId;
    }

    if (donorName !== undefined) {
      if (donorName !== null) {
        if (!donorName.trim()) return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 });
        if (donorName.trim().length > 50)
          return NextResponse.json(
            { error: "الاسم طويل جداً (50 حرفاً كحد أقصى)" },
            { status: 400 },
          );
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
        return NextResponse.json(
          { error: "المبلغ يجب أن يكون رقماً صحيحاً موجباً" },
          { status: 400 },
        );
      }
      data.amount = n;
    }

    if (paymentMethod !== undefined) {
      if (paymentMethod !== null && !PAYMENT_METHODS.includes(paymentMethod)) {
        return NextResponse.json({ error: "طريقة دفع غير صالحة" }, { status: 400 });
      }
      data.paymentMethod = paymentMethod;
    }

    const donation = await prisma.donation.update({
      where: { id },
      data,
      include: { member: { select: { fullName: true } } },
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
        donation.member?.fullName || existing.donorName || "فاعل خير",
        { ...target, before: { status: existing.status }, after: { status: donation.status } },
      );
    }
    if (memberId !== undefined) {
      await logAction(
        session.username,
        memberId ? "LINK_DONATION_MEMBER" : "UNLINK_DONATION_MEMBER",
        memberId
          ? `${existing.donorName || "فاعل خير"} → ${donation.member?.fullName}`
          : existing.donorName || "فاعل خير",
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
        donation.member?.fullName || donation.donorName || "فاعل خير",
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
    // MEMBERSHIP-source rows are derived automatically (see syncMembershipDonation)
    // — deleting one here would just have it recreated the next time the
    // linked member's paidAmount/status is touched.
    if (existing.source === "MEMBERSHIP") {
      return NextResponse.json(
        { error: "هذا التبرع مُدار تلقائياً ولا يمكن حذفه يدوياً" },
        { status: 400 },
      );
    }

    await prisma.donation.delete({ where: { id } });
    await logAction(
      session.username,
      "DELETE_DONATION",
      `${existing.donorName || "فاعل خير"} — ${existing.amount ?? 0} أوقية`,
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
