import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { generateTempPassword } from "@/lib/member";
import * as bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdminRole("MEMBERS");
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    const tempPassword = generateTempPassword();
    const hashed = await bcrypt.hash(tempPassword, 12);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { password: hashed, tokenVersion: { increment: 1 } },
    });

    await logAction(session.username, "RESET_MEMBER_PASSWORD", updated.phone);

    return NextResponse.json({ tempPassword });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "ليس لديك صلاحية لهذا الإجراء" }, { status: 403 });
    }
    console.error("Reset password error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
