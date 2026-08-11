import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { validatePhone } from "@/lib/utils";
import { logAction } from "@/lib/audit";
import { validatePaidAmount } from "@/lib/donations";
import { syncMembershipDonation } from "@/lib/donationsServer";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Renaming a player often happens while managing a tournament roster,
    // so either admin scope may do it — not just "MEMBERS".
    const session = await requireAdminRole("MEMBERS", "ACTIVITIES");
    const { id } = await params;
    const { fullName, phone, age, photo, paidAmount } = await req.json();

    const existing = await prisma.member.findUnique({ where: { id }, select: { fullName: true } });
    if (!existing) {
      return NextResponse.json({ error: "العضو غير موجود" }, { status: 404 });
    }

    const data: { fullName?: string; phone?: string; age?: string; photo?: string | null; paidAmount?: number | null } = {};

    if (fullName !== undefined) {
      if (!fullName.trim()) return NextResponse.json({ error: "الاسم الكامل مطلوب" }, { status: 400 });
      if (fullName.trim().length > 30) return NextResponse.json({ error: "الاسم الكامل طويل جداً (30 حرفاً كحد أقصى)" }, { status: 400 });
      data.fullName = fullName.trim();
    }
    if (phone !== undefined) {
      const phoneError = validatePhone(phone);
      if (phoneError) return NextResponse.json({ error: phoneError }, { status: 400 });
      data.phone = phone.trim();
    }
    if (age !== undefined) {
      if (!age.trim()) return NextResponse.json({ error: "اسم العصر مطلوب" }, { status: 400 });
      if (age.trim().length > 30) return NextResponse.json({ error: "اسم العصر طويل جداً (30 حرفاً كحد أقصى)" }, { status: 400 });
      data.age = age.trim();
    }
    if (photo !== undefined) {
      if (photo !== null && typeof photo !== "string") {
        return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
      }
      data.photo = photo;
    }
    if (paidAmount !== undefined) {
      if (paidAmount === null) {
        data.paidAmount = null;
      } else {
        const paidAmountError = validatePaidAmount(paidAmount);
        if (paidAmountError) return NextResponse.json({ error: paidAmountError }, { status: 400 });
        data.paidAmount = Number(paidAmount);
      }
    }

    const member = await prisma.$transaction(async (tx) => {
      const m = await tx.member.update({ where: { id }, data });
      await syncMembershipDonation(tx, id);
      return m;
    });
    await logAction(session.username, "UPDATE_MEMBER", `${existing.fullName} → ${member.fullName}`);

    return NextResponse.json({ member });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "ليس لديك صلاحية لهذا الإجراء" }, { status: 403 });
    }
    console.error("Update member error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminRole("MEMBERS");
    const { id } = await params;

    const member = await prisma.member.findUnique({ where: { id }, select: { fullName: true } });
    if (!member) {
      return NextResponse.json({ error: "الطلب غير موجود" }, { status: 404 });
    }

    await prisma.member.delete({ where: { id } });
    await logAction(session.username, "DELETE_MEMBER", member.fullName);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "ليس لديك صلاحية لهذا الإجراء" }, { status: 403 });
    }
    console.error("Delete member error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
