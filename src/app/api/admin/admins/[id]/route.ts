import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminRole("SUPER");
    const { id } = await params;

    if (id === session.adminId) {
      return NextResponse.json({ error: "لا يمكنك حذف حسابك الخاص" }, { status: 400 });
    }

    const count = await prisma.admin.count();
    if (count <= 1) {
      return NextResponse.json({ error: "لا يمكن حذف آخر حساب مشرف" }, { status: 400 });
    }

    const target = await prisma.admin.findUnique({ where: { id }, select: { username: true } });
    if (!target) {
      return NextResponse.json({ error: "الحساب غير موجود" }, { status: 404 });
    }

    await prisma.admin.delete({ where: { id } });
    await logAction(session.username, "DELETE_ADMIN", target.username);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "ليس لديك صلاحية لهذا الإجراء" }, { status: 403 });
    }
    console.error("Delete admin error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
