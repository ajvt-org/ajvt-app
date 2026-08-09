import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = await requireAdminRole("ACTIVITIES");
    const { teamId } = await params;
    const { name, groupId } = await req.json();

    const existing = await prisma.team.findUnique({ where: { id: teamId }, select: { activityId: true } });
    if (!existing) {
      return NextResponse.json({ error: "الفريق غير موجود" }, { status: 404 });
    }

    const data: { name?: string; groupId?: string | null } = {};

    if (name !== undefined) {
      if (!name.trim()) return NextResponse.json({ error: "اسم الفريق مطلوب" }, { status: 400 });
      if (name.trim().length > 40) return NextResponse.json({ error: "اسم الفريق طويل جداً (40 حرفاً كحد أقصى)" }, { status: 400 });
      data.name = name.trim();
    }
    if (groupId !== undefined) {
      if (groupId) {
        const group = await prisma.group.findFirst({ where: { id: groupId, activityId: existing.activityId } });
        if (!group) return NextResponse.json({ error: "المجموعة غير موجودة" }, { status: 400 });
      }
      data.groupId = groupId || null;
    }

    const team = await prisma.team.update({ where: { id: teamId }, data });
    await logAction(session.username, "UPDATE_TEAM", team.name);

    return NextResponse.json({ team });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "ليس لديك صلاحية لهذا الإجراء" }, { status: 403 });
    }
    console.error("Team update error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = await requireAdminRole("ACTIVITIES");
    const { teamId } = await params;

    const team = await prisma.team.findUnique({ where: { id: teamId }, select: { name: true } });
    if (!team) {
      return NextResponse.json({ error: "الفريق غير موجود" }, { status: 404 });
    }

    await prisma.team.delete({ where: { id: teamId } });
    await logAction(session.username, "DELETE_TEAM", team.name);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "ليس لديك صلاحية لهذا الإجراء" }, { status: 403 });
    }
    console.error("Team delete error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
