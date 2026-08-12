import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { validatePhone } from "@/lib/utils";
import { PAYMENT_METHODS } from "@/lib/donations";
import { logAction } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Donations are only visible to SUPER admins today (see payment-proofs'
    // includeDonations gate) — management follows the same scope: the admin
    // needs to be able to fix any real-world edge case (typo'd name, wrong
    // amount, wrong attribution, a donor who wants out) without being
    // blocked, so every editable field lives behind this one endpoint.
    const session = await requireAdminRole("SUPER");
    const { id } = await params;
    const { status, memberId, donorName, donorPhone, donorPhoto, amount, paymentMethod, proof } = await req.json();

    if ([status, memberId, donorName, donorPhone, donorPhoto, amount, paymentMethod, proof].every((v) => v === undefined)) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }
    if (status !== undefined && !["ACTIVE", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }
    if (memberId !== undefined && memberId !== null && typeof memberId !== "string") {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }
    if (donorPhoto !== undefined && donorPhoto !== null && typeof donorPhoto !== "string") {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }
    if (proof !== undefined && proof !== null && typeof proof !== "string") {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    const existing = await prisma.donation.findUnique({ where: { id }, select: { source: true, donorName: true } });
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
    if (existing.source === "MEMBERSHIP" && [status, memberId, donorName, donorPhone, donorPhoto, amount, proof].some((v) => v !== undefined)) {
      return NextResponse.json({ error: "هذا التبرع مُدار تلقائياً ولا يمكن تعديله يدوياً" }, { status: 400 });
    }

    const data: { status?: string; memberId?: string | null; donorName?: string | null; donorPhone?: string | null; donorPhoto?: string | null; amount?: number; paymentMethod?: string | null; proof?: string | null } = {};
    if (status !== undefined) data.status = status;

    if (memberId !== undefined) {
      if (memberId !== null) {
        const member = await prisma.member.findUnique({ where: { id: memberId }, select: { id: true } });
        if (!member) return NextResponse.json({ error: "العضو غير موجود" }, { status: 404 });
      }
      data.memberId = memberId;
    }

    if (donorName !== undefined) {
      if (donorName !== null) {
        if (!donorName.trim()) return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 });
        if (donorName.trim().length > 50) return NextResponse.json({ error: "الاسم طويل جداً (50 حرفاً كحد أقصى)" }, { status: 400 });
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
        return NextResponse.json({ error: "المبلغ يجب أن يكون رقماً صحيحاً موجباً" }, { status: 400 });
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

    if (status !== undefined) {
      await logAction(session.username, status === "ACTIVE" ? "APPROVE_DONATION" : "REJECT_DONATION", donation.member?.fullName || existing.donorName || "فاعل خير");
    }
    if (memberId !== undefined) {
      await logAction(
        session.username,
        memberId ? "LINK_DONATION_MEMBER" : "UNLINK_DONATION_MEMBER",
        memberId ? `${existing.donorName || "فاعل خير"} → ${donation.member?.fullName}` : (existing.donorName || "فاعل خير")
      );
    }
    if (donorName !== undefined || donorPhone !== undefined || donorPhoto !== undefined || amount !== undefined || paymentMethod !== undefined || proof !== undefined) {
      await logAction(session.username, "UPDATE_DONATION", donation.member?.fullName || donation.donorName || "فاعل خير");
    }

    return NextResponse.json({ donation });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "ليس لديك صلاحية لهذا الإجراء" }, { status: 403 });
    }
    console.error("Donation update error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminRole("SUPER");
    const { id } = await params;

    const existing = await prisma.donation.findUnique({ where: { id }, select: { source: true, donorName: true, amount: true } });
    if (!existing) {
      return NextResponse.json({ error: "التبرع غير موجود" }, { status: 404 });
    }
    // MEMBERSHIP-source rows are derived automatically (see syncMembershipDonation)
    // — deleting one here would just have it recreated the next time the
    // linked member's paidAmount/status is touched.
    if (existing.source === "MEMBERSHIP") {
      return NextResponse.json({ error: "هذا التبرع مُدار تلقائياً ولا يمكن حذفه يدوياً" }, { status: 400 });
    }

    await prisma.donation.delete({ where: { id } });
    await logAction(session.username, "DELETE_DONATION", `${existing.donorName || "فاعل خير"} — ${existing.amount ?? 0} أوقية`);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "ليس لديك صلاحية لهذا الإجراء" }, { status: 403 });
    }
    console.error("Donation delete error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
