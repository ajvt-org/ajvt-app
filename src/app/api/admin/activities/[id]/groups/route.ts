import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminRole("ACTIVITIES");
    const { id } = await params;

    const groups = await prisma.group.findMany({
      where: { activityId: id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ groups });
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminRole("ACTIVITIES");
    const { id } = await params;
    const { name } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "اسم المجموعة مطلوب" }, { status: 400 });
    }
    if (name.trim().length > 40) {
      return NextResponse.json({ error: "اسم المجموعة طويل جداً (40 حرفاً كحد أقصى)" }, { status: 400 });
    }

    const activity = await prisma.activity.findUnique({ where: { id }, select: { isTournament: true } });
    if (!activity?.isTournament) {
      return NextResponse.json({ error: "هذا النشاط ليس بطولة" }, { status: 400 });
    }

    const group = await prisma.group.create({ data: { activityId: id, name: name.trim() } });
    await logAction(session.username, "CREATE_GROUP", group.name);

    return NextResponse.json({ group }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "ليس لديك صلاحية لهذا الإجراء" }, { status: 403 });
    }
    console.error("Group create error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
