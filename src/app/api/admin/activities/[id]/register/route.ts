import { NextRequest, NextResponse } from "next/server";
import { requireActivityAccess } from "@/lib/activityAccessServer";
import { logAction, auditContext } from "@/lib/audit";
import { sendPushToUser } from "@/lib/push";
import { withRoute } from "@/lib/route";
import { logger } from "@/lib/logger";
import { parse } from "@/lib/validation";
import { adminRegisterSchema, registrationReviewSchema } from "./schema";
import { notify } from "@/lib/messages";
import { nameOf } from "@/lib/person";
import {
  registerToActivity,
  removeRegistration,
  reviewRegistration,
} from "@/lib/activityRegisterServer";

export const POST = withRoute(
  "POST /api/admin/activities/[id]/register",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const session = await requireActivityAccess(id);
    const { userId } = parse(adminRegisterSchema, await req.json());

    const { registration, account, activity } = await registerToActivity(
      id,
      userId,
      session.username,
    );

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

    const { updated, kept, before } = await reviewRegistration(id, {
      registrationId,
      status,
      reason,
    });

    await logAction(
      session.username,
      status === "ACTIVE" ? "APPROVE_ACTIVITY_REGISTRATION" : "REJECT_ACTIVITY_REGISTRATION",
      `${nameOf(before.user)} → ${before.activity.title}`,
      {
        ...auditContext(session, req),
        targetType: "ActivityRegistration",
        targetId: registrationId,
        before: { status: before.status, rejectionReason: before.rejectionReason },
        after: { status: updated.status, rejectionReason: updated.rejectionReason },
      },
    );

    if (before.userId) {
      sendPushToUser(
        before.userId,
        notify.registrationDecision(
          status === "ACTIVE",
          before.activity.title,
          reason ?? undefined,
        ),
        "ACTIVITY_DECISION",
      ).catch((err) => logger.error("registration.review.push.error", err));
    }

    return NextResponse.json({ registration: updated, keptTeamPlace: kept > 0 });
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/activities/[id]/register",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const session = await requireActivityAccess(id);
    const { userId } = parse(adminRegisterSchema, await req.json());

    const { existing, released } = await removeRegistration(id, userId);
    if (!existing || !released) return NextResponse.json({ ok: true, keptTeamPlace: false });

    await logAction(
      session.username,
      "ADMIN_UNREGISTER_ACTIVITY",
      `${nameOf(existing.user)} — ${existing.activity.title}`,
      {
        ...auditContext(session, req),
        targetType: "ActivityRegistration",
        targetId: existing.id,
        before: { userId, activityId: id, status: existing.status },
        after: { teamPlacesRemoved: released.removed, teamPlacesKept: released.kept },
      },
    );

    return NextResponse.json({ ok: true, keptTeamPlace: released.kept > 0 });
  },
);
