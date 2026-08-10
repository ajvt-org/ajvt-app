import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await requireUser();
    const { activityId, memberIds, paymentProof } = await req.json();

    if (!activityId || !Array.isArray(memberIds) || memberIds.length === 0) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }
    const uniqueMemberIds = Array.from(new Set(memberIds)) as string[];
    if (!paymentProof || typeof paymentProof !== "string") {
      return NextResponse.json({ error: "يرجى إرفاق صورة إثبات الدفع" }, { status: 400 });
    }

    const [members, activity] = await Promise.all([
      prisma.member.findMany({ where: { id: { in: uniqueMemberIds } } }),
      prisma.activity.findUnique({
        where: { id: activityId },
        select: {
          id: true,
          isOpen: true,
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
    if (members.length !== uniqueMemberIds.length || members.some((m) => m.userId !== session.userId)) {
      return NextResponse.json({ error: "أحد الأعضاء غير موجود" }, { status: 404 });
    }
    if (members.some((m) => m.status === "REJECTED")) {
      return NextResponse.json({ error: "لا يمكن التسجيل في الأنشطة لطلب انضمام مرفوض" }, { status: 403 });
    }

    const existing = await prisma.activityRegistration.findMany({
      where: { memberId: { in: uniqueMemberIds }, activityId },
      select: { memberId: true, status: true },
    });
    const existingByMember = new Map(existing.map((e) => [e.memberId, e.status]));
    // Members already pending/active are left untouched — only new or
    // previously-rejected members actually consume a capacity slot.
    const toSubmit = uniqueMemberIds.filter((id) => {
      const status = existingByMember.get(id);
      return status !== "PENDING" && status !== "ACTIVE";
    });

    if (toSubmit.length === 0) {
      return NextResponse.json({ error: "الأعضاء المحددون مسجّلون بالفعل" }, { status: 409 });
    }

    if (activity.capacity !== null && activity._count.registrations + toSubmit.length > activity.capacity) {
      return NextResponse.json({ error: "لا يوجد عدد كافٍ من الأماكن المتبقية في هذا النشاط" }, { status: 409 });
    }

    await prisma.$transaction(
      toSubmit.map((memberId) =>
        prisma.activityRegistration.upsert({
          where: { memberId_activityId: { memberId, activityId } },
          update: { status: "PENDING", paymentProof, rejectionReason: null },
          create: { memberId, activityId, status: "PENDING", paymentProof },
        })
      )
    );

    return NextResponse.json({ ok: true, submitted: toSubmit.length, skipped: uniqueMemberIds.length - toSubmit.length });
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
