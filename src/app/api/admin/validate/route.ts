import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { generateMemberNumber } from "@/lib/member";
import { sendPushToUser } from "@/lib/push";
import { logAction } from "@/lib/audit";
import { syncMembershipDonation } from "@/lib/donationsServer";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdminRole("MEMBERS");
    const { id, action } = await req.json();

    if (!id || !["ACTIVE", "REJECTED"].includes(action)) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    const existing = await prisma.member.findUnique({ where: { id }, select: { status: true, memberNumber: true } });
    let memberNumber: string | undefined;
    if (action === "ACTIVE" && !existing?.memberNumber) {
      memberNumber = await generateMemberNumber();
    }

    const updated = await prisma.$transaction(async (tx) => {
      const m = await tx.member.update({
        where: { id },
        data: { status: action, ...(memberNumber ? { memberNumber } : {}) },
      });
      await syncMembershipDonation(tx, id);
      return m;
    });

    const statusLabel: Record<string, string> = { PENDING: "قيد الانتظار", ACTIVE: "مقبول", REJECTED: "غير مقبول" };
    const transition = existing ? ` (من ${statusLabel[existing.status]} إلى ${statusLabel[action]})` : "";
    await logAction(session.username, action === "ACTIVE" ? "APPROVE_MEMBER" : "REJECT_MEMBER", `${updated.fullName}${transition}`);

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
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "ليس لديك صلاحية لهذا الإجراء" }, { status: 403 });
    }
    console.error("Validate error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
