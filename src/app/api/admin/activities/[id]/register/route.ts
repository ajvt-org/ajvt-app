import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActivityAccess } from "@/lib/activityAccessServer";
import { logAction, auditContext } from "@/lib/audit";
import { sendPushToUser } from "@/lib/push";
import { withRoute } from "@/lib/route";
import { logger } from "@/lib/logger";
import { parse } from "@/lib/validation";
import { adminRegisterSchema, registrationReviewSchema } from "./schema";
import { activities, members, notify } from "@/lib/messages";
import { nameOf } from "@/lib/person";

export const POST = withRoute(
  "POST /api/admin/activities/[id]/register",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const session = await requireActivityAccess(id);
    const { memberId } = parse(adminRegisterSchema, await req.json());

    const [member, activity] = await Promise.all([
      prisma.member.findUnique({
        where: { id: memberId },
        select: { id: true, user: { select: { fullName: true } } },
      }),
      prisma.activity.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          capacity: true,
          _count: { select: { registrations: { where: { status: { not: "REJECTED" } } } } },
        },
      }),
    ]);
    if (!member) return NextResponse.json({ error: members.notFound }, { status: 404 });
    if (!activity) return NextResponse.json({ error: activities.notFound }, { status: 404 });

    if (activity.capacity !== null && activity._count.registrations >= activity.capacity) {
      const already = await prisma.activityRegistration.findUnique({
        where: { memberId_activityId: { memberId, activityId: id } },
      });
      if (!already) {
        return NextResponse.json({ error: "اكتمل عدد المسجلين في هذا النشاط" }, { status: 409 });
      }
    }

    const registration = await prisma.activityRegistration.upsert({
      where: { memberId_activityId: { memberId, activityId: id } },
      update: { status: "ACTIVE", rejectionReason: null },
      create: { memberId, activityId: id, status: "ACTIVE" },
    });

    await logAction(
      session.username,
      "ADMIN_REGISTER_ACTIVITY",
      `${nameOf(member.user)} → ${activity.title}`,
      {
        ...auditContext(session, req),
        targetType: "ActivityRegistration",
        targetId: registration.id,
        after: { status: registration.status, memberId, activityId: id },
      },
    );

    return NextResponse.json({ ok: true });
  },
);

export const PATCH = withRoute(
  "PATCH /api/admin/activities/[id]/register",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const session = await requireActivityAccess(id);
    const { registrationId, status, reason } = parse(registrationReviewSchema, await req.json());

    const registration = await prisma.activityRegistration.findUnique({
      where: { id: registrationId },
      select: {
        activityId: true,
        status: true,
        rejectionReason: true,
        member: { select: { userId: true, user: { select: { fullName: true } } } },
        activity: { select: { title: true } },
      },
    });
    if (!registration || registration.activityId !== id) {
      return NextResponse.json({ error: "طلب التسجيل غير موجود" }, { status: 404 });
    }

    const updated = await prisma.activityRegistration.update({
      where: { id: registrationId },
      data: {
        status,
        rejectionReason: status === "REJECTED" ? reason?.trim() || null : null,
      },
    });

    await logAction(
      session.username,
      status === "ACTIVE" ? "APPROVE_ACTIVITY_REGISTRATION" : "REJECT_ACTIVITY_REGISTRATION",
      `${registration.member.user.fullName} → ${registration.activity.title}`,
      {
        ...auditContext(session, req),
        targetType: "ActivityRegistration",
        targetId: registrationId,
        before: { status: registration.status, rejectionReason: registration.rejectionReason },
        after: { status: updated.status, rejectionReason: updated.rejectionReason },
      },
    );

    if (registration.member.userId) {
      sendPushToUser(
        registration.member.userId,
        notify.registrationDecision(
          status === "ACTIVE",
          registration.activity.title,
          reason ?? undefined,
        ),
        "ACTIVITY_DECISION",
      ).catch((err) => logger.error("registration.review.push.error", err));
    }

    return NextResponse.json({ registration: updated });
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/activities/[id]/register",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const session = await requireActivityAccess(id);
    const { memberId } = parse(adminRegisterSchema, await req.json());

    const existing = await prisma.activityRegistration.findUnique({
      where: { memberId_activityId: { memberId, activityId: id } },
      select: {
        id: true,
        status: true,
        member: { select: { user: { select: { fullName: true } } } },
        activity: { select: { title: true } },
      },
    });
    if (!existing) return NextResponse.json({ ok: true });

    await prisma.activityRegistration.delete({ where: { id: existing.id } });
    await logAction(
      session.username,
      "ADMIN_UNREGISTER_ACTIVITY",
      `${existing.member.user.fullName} — ${existing.activity.title}`,
      {
        ...auditContext(session, req),
        targetType: "ActivityRegistration",
        targetId: existing.id,
        before: { memberId, activityId: id, status: existing.status },
      },
    );

    return NextResponse.json({ ok: true });
  },
);
