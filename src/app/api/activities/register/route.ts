import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

// Registering for an activity is free — the membership fee already paid to
// get approved (ACTIVE) covers it, so this never asks for another payment.
export async function POST(req: NextRequest) {
  try {
    const session = await requireUser();
    const { activityId, memberId } = await req.json();

    if (!activityId || !memberId) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    const [member, activity] = await Promise.all([
      prisma.member.findUnique({ where: { id: memberId } }),
      prisma.activity.findUnique({
        where: { id: activityId },
        select: {
          id: true,
          isOpen: true,
          isVolunteer: true,
          capacity: true,
          _count: { select: { registrations: { where: { status: { not: "REJECTED" } } } } },
        },
      }),
    ]);
    if (!activity) {
      return NextResponse.json({ error: "النشاط غير موجود" }, { status: 404 });
    }
    if (!activity.isOpen) {
      return NextResponse.json({ error: "التسجيل في هذا النشاط مغلق" }, { status: 409 });
    }
    if (!member || member.userId !== session.userId) {
      return NextResponse.json({ error: "العضو غير موجود" }, { status: 404 });
    }
    if (member.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "يجب أن تكون عضوية هذا الشخص مقبولة أولاً" },
        { status: 403 },
      );
    }

    const existing = await prisma.activityRegistration.findUnique({
      where: { memberId_activityId: { memberId, activityId } },
    });
    if (existing && existing.status !== "REJECTED") {
      return NextResponse.json({ error: "مسجَّل بالفعل في هذا النشاط" }, { status: 409 });
    }

    if (
      activity.capacity !== null &&
      activity._count.registrations >= activity.capacity &&
      !existing
    ) {
      return NextResponse.json(
        { error: "لا يوجد عدد كافٍ من الأماكن المتبقية في هذا النشاط" },
        { status: 409 },
      );
    }

    const status = activity.isVolunteer ? "ACTIVE" : "PENDING";
    await prisma.activityRegistration.upsert({
      where: { memberId_activityId: { memberId, activityId } },
      update: { status, rejectionReason: null },
      create: { memberId, activityId, status },
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
