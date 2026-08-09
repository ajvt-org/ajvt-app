import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { validatePhone } from "@/lib/utils";
import { generateMemberNumber } from "@/lib/member";
import { logAction } from "@/lib/audit";
import * as bcrypt from "bcryptjs";
import { sendMatchReminders } from "@/lib/tournamentNotify";

export async function GET() {
  try {
    await requireAdminRole("MEMBERS");
    sendMatchReminders().catch((err) => console.error("Match reminders error:", err));
    const members = await prisma.member.findMany({
      include: {
        user: { select: { phone: true } },
        registrations: { select: { activityId: true, activity: { select: { id: true, title: true } } } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ members });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "ليس لديك صلاحية لهذا الإجراء" }, { status: 403 });
    }
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

function generateTempPassword(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdminRole("MEMBERS");
    const { accountPhone, fullName, memberPhone, age, paymentMethod, paymentProof, status } = await req.json();

    const phoneError = validatePhone(accountPhone);
    if (phoneError) return NextResponse.json({ error: phoneError }, { status: 400 });
    if (!fullName?.trim() || !memberPhone?.trim() || !age?.trim() || !paymentMethod?.trim()) {
      return NextResponse.json({ error: "جميع الحقول مطلوبة" }, { status: 400 });
    }
    if (fullName.trim().length > 30) {
      return NextResponse.json({ error: "الاسم الكامل طويل جداً (30 حرفاً كحد أقصى)" }, { status: 400 });
    }
    if (age.trim().length > 30) {
      return NextResponse.json({ error: "اسم العصر طويل جداً (30 حرفاً كحد أقصى)" }, { status: 400 });
    }
    if (!["PENDING", "ACTIVE"].includes(status)) {
      return NextResponse.json({ error: "حالة غير صالحة" }, { status: 400 });
    }
    if (paymentProof !== undefined && paymentProof !== null && typeof paymentProof !== "string") {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    let user = await prisma.user.findUnique({ where: { phone: accountPhone.trim() } });
    let tempPassword: string | undefined;
    if (!user) {
      tempPassword = generateTempPassword();
      const hashed = await bcrypt.hash(tempPassword, 12);
      user = await prisma.user.create({ data: { phone: accountPhone.trim(), password: hashed } });
    }

    const memberNumber = status === "ACTIVE" ? await generateMemberNumber() : undefined;

    const member = await prisma.member.create({
      data: {
        userId: user.id,
        fullName: fullName.trim(),
        phone: memberPhone.trim(),
        age: age.trim(),
        paymentMethod,
        paymentProof: paymentProof || null,
        status,
        memberNumber,
      },
    });

    await logAction(session.username, "CREATE_MEMBER_MANUAL", member.fullName);

    return NextResponse.json({ member, tempPassword }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "ليس لديك صلاحية لهذا الإجراء" }, { status: 403 });
    }
    console.error("Manual member create error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
