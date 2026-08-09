import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

async function loadMemberAndActivity(userId: string, memberId: string, activityId: string) {
  const [member, activity] = await Promise.all([
    prisma.member.findUnique({ where: { id: memberId } }),
    prisma.activity.findUnique({
      where: { id: activityId },
      select: { id: true, isOpen: true, capacity: true, _count: { select: { registrations: true } } },
    }),
  ]);

  if (!member || member.userId !== userId) return { error: "العضو غير موجود" as const, status: 404 as const };
  if (!activity) return { error: "النشاط غير موجود" as const, status: 404 as const };

  return { member, activity };
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser();
    const { memberId, activityId } = await req.json();
    if (!memberId || !activityId) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    const loaded = await loadMemberAndActivity(session.userId, memberId, activityId);
    if ("error" in loaded) return NextResponse.json({ error: loaded.error }, { status: loaded.status });
    const { member, activity } = loaded;

    if (member.status !== "ACTIVE") {
      return NextResponse.json({ error: "يجب قبول عضويتك أولاً قبل التسجيل في الأنشطة" }, { status: 403 });
    }
    if (!activity.isOpen) {
      return NextResponse.json({ error: "التسجيل في هذا النشاط مغلق" }, { status: 409 });
    }
    if (activity.capacity !== null && activity._count.registrations >= activity.capacity) {
      const already = await prisma.activityRegistration.findUnique({
        where: { memberId_activityId: { memberId, activityId } },
      });
      if (!already) {
        return NextResponse.json({ error: "اكتمل عدد المسجلين في هذا النشاط" }, { status: 409 });
      }
    }

    await prisma.activityRegistration.upsert({
      where: { memberId_activityId: { memberId, activityId } },
      update: {},
      create: { memberId, activityId },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    console.error("Activity register error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await requireUser();
    const { memberId, activityId } = await req.json();
    if (!memberId || !activityId) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member || member.userId !== session.userId) {
      return NextResponse.json({ error: "العضو غير موجود" }, { status: 404 });
    }

    await prisma.activityRegistration.deleteMany({ where: { memberId, activityId } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    console.error("Activity unregister error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
