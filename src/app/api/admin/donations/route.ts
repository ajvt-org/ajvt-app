import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { validatePhone } from "@/lib/utils";
import { PAYMENT_METHODS } from "@/lib/donations";
import { logAction } from "@/lib/audit";

// Records a donation the admin collected outside the app (cash in hand,
// bank transfer confirmed by phone, etc.) — no proof screenshot required,
// the admin is the one vouching for it. Counted immediately (SUPER already
// confirmed it happened), same as manually-added members.
export async function POST(req: NextRequest) {
  try {
    const session = await requireAdminRole("SUPER");
    const { donorName, donorPhone, amount, proof, donorPhoto, paymentMethod } = await req.json();

    if (!donorName?.trim()) {
      return NextResponse.json({ error: "الاسم مطلوب" }, { status: 400 });
    }
    if (donorName.trim().length > 50) {
      return NextResponse.json({ error: "الاسم طويل جداً (50 حرفاً كحد أقصى)" }, { status: 400 });
    }
    if (donorPhone !== undefined && donorPhone !== null && donorPhone !== "") {
      const phoneError = validatePhone(donorPhone);
      if (phoneError) return NextResponse.json({ error: phoneError }, { status: 400 });
    }
    const n = Number(amount);
    if (!Number.isInteger(n) || n <= 0) {
      return NextResponse.json({ error: "المبلغ يجب أن يكون رقماً صحيحاً موجباً" }, { status: 400 });
    }
    if (proof !== undefined && proof !== null && typeof proof !== "string") {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }
    if (donorPhoto !== undefined && donorPhoto !== null && typeof donorPhoto !== "string") {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }
    if (paymentMethod !== undefined && paymentMethod !== null && !PAYMENT_METHODS.includes(paymentMethod)) {
      return NextResponse.json({ error: "طريقة دفع غير صالحة" }, { status: 400 });
    }

    const donation = await prisma.donation.create({
      data: {
        donorName: donorName.trim(),
        donorPhone: donorPhone?.trim() || null,
        amount: n,
        proof: proof || null,
        donorPhoto: donorPhoto || null,
        paymentMethod: paymentMethod || null,
        source: "PUBLIC",
        status: "ACTIVE",
      },
    });
    await logAction(session.username, "CREATE_DONATION_MANUAL", `${donorName.trim()} — ${n} أوقية`);

    return NextResponse.json({ donation }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "ليس لديك صلاحية لهذا الإجراء" }, { status: 403 });
    }
    console.error("Manual donation create error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
