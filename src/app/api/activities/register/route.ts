import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { activityRegisterSchema } from "./schema";

// Registering for an activity is free — the membership fee already paid to
// get approved (ACTIVE) covers it, so this never asks for another payment.
export const POST = withRoute("POST /api/activities/register", async (req: NextRequest) => {
  const session = await requireUser();
  const { activityId, memberId } = parse(activityRegisterSchema, await req.json());

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
});

export const DELETE = withRoute("DELETE /api/activities/register", async (req: NextRequest) => {
  const session = await requireUser();
  const { memberId, activityId } = parse(activityRegisterSchema, await req.json());

  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member || member.userId !== session.userId) {
    return NextResponse.json({ error: "العضو غير موجود" }, { status: 404 });
  }

  await prisma.activityRegistration.deleteMany({ where: { memberId, activityId } });

  return NextResponse.json({ ok: true });
});
