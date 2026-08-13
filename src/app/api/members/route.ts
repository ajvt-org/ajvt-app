import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { validatePaidAmount } from "@/lib/donations";

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser();
    const { id, fullName, phone, age, paymentMethod, paymentProof, photo, paidAmount, referenceCode } = await req.json();

    if (!fullName) return NextResponse.json({ error: "الاسم الكامل مطلوب" }, { status: 400 });
    if (!phone) return NextResponse.json({ error: "رقم الهاتف مطلوب" }, { status: 400 });
    if (!age) return NextResponse.json({ error: "يرجى اختيار العصر" }, { status: 400 });
    if (!paymentMethod) return NextResponse.json({ error: "يرجى اختيار طريقة الدفع" }, { status: 400 });
    if (!paymentProof) return NextResponse.json({ error: "يرجى إرفاق صورة الكابتير" }, { status: 400 });
    if (fullName.trim().length > 30) {
      return NextResponse.json({ error: "الاسم الكامل طويل جداً (30 حرفاً كحد أقصى)" }, { status: 400 });
    }
    if (age.trim().length > 30) {
      return NextResponse.json({ error: "اسم العصر طويل جداً (30 حرفاً كحد أقصى)" }, { status: 400 });
    }
    if (photo !== undefined && photo !== null && typeof photo !== "string") {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }
    if (referenceCode !== undefined && (typeof referenceCode !== "string" || referenceCode.length > 20)) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }
    const paidAmountError = validatePaidAmount(paidAmount);
    if (paidAmountError) return NextResponse.json({ error: paidAmountError }, { status: 400 });

    // Editing an existing entry (fix a typo while PENDING, or resubmit after REJECTED)
    if (id) {
      const existing = await prisma.member.findUnique({ where: { id } });
      if (!existing || existing.userId !== session.userId) {
        return NextResponse.json({ error: "العضو غير موجود" }, { status: 404 });
      }
      if (existing.status === "ACTIVE") {
        return NextResponse.json({ error: "هذا العضو مقبول بالفعل" }, { status: 409 });
      }

      const updated = await prisma.member.update({
        where: { id },
        data: {
          fullName: fullName.trim(),
          phone: phone.trim(),
          age: age.trim(),
          paymentMethod,
          paymentProof,
          ...(photo !== undefined ? { photo } : {}),
          // Never overwrite an existing code — the member may already have
          // written it on a real bank transfer note.
          ...(!existing.referenceCode && referenceCode ? { referenceCode } : {}),
          paidAmount: Number(paidAmount),
          status: "PENDING",
          rejectionReason: null,
        },
      });
      return NextResponse.json({ id: updated.id }, { status: 200 });
    }

    // New member under this account — no cap on how many
    const member = await prisma.member.create({
      data: {
        userId: session.userId,
        fullName: fullName.trim(),
        phone: phone.trim(),
        age: age.trim(),
        paymentMethod,
        paymentProof,
        photo: photo || null,
        paidAmount: Number(paidAmount),
        referenceCode: referenceCode || null,
        status: "PENDING",
      },
    });

    return NextResponse.json({ id: member.id }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      return NextResponse.json({ error: "رمز الطلب مستخدم بالفعل، يرجى إعادة المحاولة" }, { status: 409 });
    }
    console.error("Member create error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
