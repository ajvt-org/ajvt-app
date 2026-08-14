import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> },
) {
  try {
    const session = await requireAdminRole("ACTIVITIES");
    const { groupId } = await params;
    const { name, capacity } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "اسم المجموعة مطلوب" }, { status: 400 });
    }
    if (name.trim().length > 40) {
      return NextResponse.json(
        { error: "اسم المجموعة طويل جداً (40 حرفاً كحد أقصى)" },
        { status: 400 },
      );
    }
    const data: { name: string; capacity?: number | null } = { name: name.trim() };
    if (capacity !== undefined) {
      if (capacity === null || capacity === "") {
        data.capacity = null;
      } else {
        const capacityValue = Number(capacity);
        if (!Number.isInteger(capacityValue) || capacityValue < 2 || capacityValue > 64) {
          return NextResponse.json(
            { error: "عدد الفرق المستهدف يجب أن يكون بين 2 و64" },
            { status: 400 },
          );
        }
        data.capacity = capacityValue;
      }
    }

    const group = await prisma.group.update({ where: { id: groupId }, data });
    await logAction(session.username, "UPDATE_GROUP", group.name);

    return NextResponse.json({ group });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "ليس لديك صلاحية لهذا الإجراء" }, { status: 403 });
    }
    console.error("Group update error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> },
) {
  try {
    const session = await requireAdminRole("ACTIVITIES");
    const { groupId } = await params;

    const group = await prisma.group.findUnique({ where: { id: groupId }, select: { name: true } });
    if (!group) {
      return NextResponse.json({ error: "المجموعة غير موجودة" }, { status: 404 });
    }

    await prisma.group.delete({ where: { id: groupId } });
    await logAction(session.username, "DELETE_GROUP", group.name);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "ليس لديك صلاحية لهذا الإجراء" }, { status: 403 });
    }
    console.error("Group delete error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
