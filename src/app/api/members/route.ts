import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser();
    const { fullName, phone, age, paymentMethod, paymentProof } = await req.json();

    if (!fullName || !phone || !age || !paymentMethod || !paymentProof) {
      return NextResponse.json({ error: "جميع الحقول مطلوبة" }, { status: 400 });
    }

    // Check if user already submitted
    const existing = await prisma.member.findUnique({ where: { userId: session.userId } });
    if (existing && existing.status !== "REJECTED") {
      return NextResponse.json({ error: "لقد قدمت طلباً مسبقاً" }, { status: 409 });
    }

    // A previously rejected member can resubmit — reuse their row instead of
    // creating a second one (userId is unique on Member).
    if (existing) {
      const updated = await prisma.member.update({
        where: { id: existing.id },
        data: {
          fullName: fullName.trim(),
          phone: phone.trim(),
          age: age.trim(),
          paymentMethod,
          paymentProof,
          status: "PENDING",
        },
      });
      return NextResponse.json({ id: updated.id }, { status: 200 });
    }

    const member = await prisma.member.create({
      data: {
        userId: session.userId,
        fullName: fullName.trim(),
        phone: phone.trim(),
        age: age.trim(),
        paymentMethod,
        paymentProof,
        status: "PENDING",
      },
    });

    return NextResponse.json({ id: member.id }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    console.error("Member create error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
