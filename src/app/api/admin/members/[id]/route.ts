import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAction } from "@/lib/audit";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
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
    console.error("Delete member error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
