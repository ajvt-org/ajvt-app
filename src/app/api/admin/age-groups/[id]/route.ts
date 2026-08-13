import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdminRole("MEMBERS");
    const { id } = await params;
    const { name } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "اسم العصر مطلوب" }, { status: 400 });
    }
    if (name.trim().length > 30) {
      return NextResponse.json({ error: "اسم العصر طويل جداً (30 حرفاً كحد أقصى)" }, { status: 400 });
    }

    const existing = await prisma.ageGroup.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "العصر غير موجود" }, { status: 404 });
    }
    const clash = await prisma.ageGroup.findUnique({ where: { name: name.trim() } });
    if (clash && clash.id !== id) {
      return NextResponse.json({ error: "هذا العصر موجود بالفعل" }, { status: 409 });
    }

    const ageGroup = await prisma.ageGroup.update({ where: { id }, data: { name: name.trim() } });
    await logAction(session.username, "UPDATE_AGE_GROUP", `${existing.name} → ${ageGroup.name}`);

    return NextResponse.json({ ageGroup });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    if (err instanceof Error && err.message === "FORBIDDEN") return NextResponse.json({ error: "ليس لديك صلاحية لهذا الإجراء" }, { status: 403 });
    console.error("Age group update error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdminRole("MEMBERS");
    const { id } = await params;

    const existing = await prisma.ageGroup.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "العصر غير موجود" }, { status: 404 });
    }

    await prisma.ageGroup.delete({ where: { id } });
    await logAction(session.username, "DELETE_AGE_GROUP", existing.name);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    if (err instanceof Error && err.message === "FORBIDDEN") return NextResponse.json({ error: "ليس لديك صلاحية لهذا الإجراء" }, { status: 403 });
    console.error("Age group delete error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
