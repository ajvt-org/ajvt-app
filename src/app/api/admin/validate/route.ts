import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { generateMemberNumber } from "@/lib/member";
import { sendPushToUser } from "@/lib/push";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { id, action } = await req.json();

    if (!id || !["ACTIVE", "REJECTED"].includes(action)) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    let memberNumber: string | undefined;
    if (action === "ACTIVE") {
      const existing = await prisma.member.findUnique({ where: { id }, select: { memberNumber: true } });
      if (!existing?.memberNumber) memberNumber = await generateMemberNumber();
    }

    const updated = await prisma.member.update({
      where: { id },
      data: { status: action, ...(memberNumber ? { memberNumber } : {}) },
    });

    sendPushToUser(updated.userId, {
      title: "رابطة شباب التاكلالت",
      body:
        action === "ACTIVE"
          ? `تهانينا! تم قبول عضوية ${updated.fullName} 🎉`
          : `نأسف، لم يتم قبول طلب انضمام ${updated.fullName}`,
      url: "/home",
    }).catch((err) => console.error("Push notify error:", err));

    return NextResponse.json({ member: updated });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    console.error("Validate error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
