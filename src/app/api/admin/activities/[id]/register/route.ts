import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminRole("ACTIVITIES");
    const { id } = await params;
    const { memberId } = await req.json();
    if (!memberId) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    const [member, activity] = await Promise.all([
      prisma.member.findUnique({ where: { id: memberId }, select: { id: true } }),
      prisma.activity.findUnique({
        where: { id },
        select: { id: true, capacity: true, _count: { select: { registrations: true } } },
      }),
    ]);
    if (!member) return NextResponse.json({ error: "العضو غير موجود" }, { status: 404 });
    if (!activity) return NextResponse.json({ error: "النشاط غير موجود" }, { status: 404 });

    if (activity.capacity !== null && activity._count.registrations >= activity.capacity) {
      const already = await prisma.activityRegistration.findUnique({
        where: { memberId_activityId: { memberId, activityId: id } },
      });
      if (!already) {
        return NextResponse.json({ error: "اكتمل عدد المسجلين في هذا النشاط" }, { status: 409 });
      }
    }

    await prisma.activityRegistration.upsert({
      where: { memberId_activityId: { memberId, activityId: id } },
      update: {},
      create: { memberId, activityId: id },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "ليس لديك صلاحية لهذا الإجراء" }, { status: 403 });
    }
    console.error("Admin activity register error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminRole("ACTIVITIES");
    const { id } = await params;
    const { memberId } = await req.json();
    if (!memberId) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    await prisma.activityRegistration.deleteMany({ where: { memberId, activityId: id } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "ليس لديك صلاحية لهذا الإجراء" }, { status: 403 });
    }
    console.error("Admin activity unregister error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
