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
import { joinChosenTeam } from "@/lib/registrationTeamServer";

export const POST = withRoute(
  "POST /api/admin/activities/[id]/register",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const session = await requireActivityAccess(id);
    const { userId } = parse(adminRegisterSchema, await req.json());

    const [account, activity] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, fullName: true },
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
    if (!account) return NextResponse.json({ error: members.notFound }, { status: 404 });
    if (!activity) return NextResponse.json({ error: activities.notFound }, { status: 404 });

    if (activity.capacity !== null && activity._count.registrations >= activity.capacity) {
      const already = await prisma.activityRegistration.findUnique({
        where: { userId_activityId: { userId: account.id, activityId: id } },
      });
      if (!already) {
        return NextResponse.json({ error: activities.capacityReached }, { status: 409 });
      }
    }

    const registration = await prisma.activityRegistration.upsert({
      where: { userId_activityId: { userId: account.id, activityId: id } },
      update: {
        status: "ACTIVE",
        rejectionReason: null,
        source: "ADMIN",
        recordedBy: session.username,
      },
      create: {
        userId: account.id,
        activityId: id,
        status: "ACTIVE",
        source: "ADMIN",
        recordedBy: session.username,
      },
    });

    await logAction(
      session.username,
      "ADMIN_REGISTER_ACTIVITY",
      `${nameOf(account)} → ${activity.title}`,
      {
        ...auditContext(session, req),
        targetType: "ActivityRegistration",
        targetId: registration.id,
        after: { status: registration.status, userId, activityId: id },
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
        userId: true,
        user: { select: { fullName: true } },
        activity: { select: { title: true } },
      },
    });
    if (!registration || registration.activityId !== id) {
      return NextResponse.json({ error: activities.registrationNotFound }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.activityRegistration.update({
        where: { id: registrationId },
        data: {
          status,
          rejectionReason: status === "REJECTED" ? reason?.trim() || null : null,
        },
      });
      if (status === "ACTIVE") await joinChosenTeam(tx, registrationId);
      return row;
    });

    await logAction(
      session.username,
      status === "ACTIVE" ? "APPROVE_ACTIVITY_REGISTRATION" : "REJECT_ACTIVITY_REGISTRATION",
      `${nameOf(registration.user)} → ${registration.activity.title}`,
      {
        ...auditContext(session, req),
        targetType: "ActivityRegistration",
        targetId: registrationId,
        before: { status: registration.status, rejectionReason: registration.rejectionReason },
        after: { status: updated.status, rejectionReason: updated.rejectionReason },
      },
    );

    if (registration.userId) {
      sendPushToUser(
        registration.userId,
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
    const { userId } = parse(adminRegisterSchema, await req.json());

    const existing = await prisma.activityRegistration.findFirst({
      where: { userId, activityId: id },
      select: {
        id: true,
        status: true,
        user: { select: { fullName: true } },
        activity: { select: { title: true } },
      },
    });
    if (!existing) return NextResponse.json({ ok: true });

    await prisma.activityRegistration.delete({ where: { id: existing.id } });
    await logAction(
      session.username,
      "ADMIN_UNREGISTER_ACTIVITY",
      `${nameOf(existing.user)} — ${existing.activity.title}`,
      {
        ...auditContext(session, req),
        targetType: "ActivityRegistration",
        targetId: existing.id,
        before: { userId, activityId: id, status: existing.status },
      },
    );

    return NextResponse.json({ ok: true });
  },
);
