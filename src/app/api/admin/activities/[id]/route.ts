import { NextRequest, NextResponse } from "next/server";
import { requireActivityAccess } from "@/lib/activityAccessServer";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { activityUpdateSchema } from "./schema";
import { activitySettings } from "@/lib/activitiesServer";
import { updateActivity } from "@/lib/activityUpdateServer";
import { deleteActivity } from "@/lib/activityCreateServer";

export const GET = withRoute(
  "GET /api/admin/activities/[id]",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    await requireActivityAccess(id);

    return NextResponse.json({ activity: await activitySettings(id) });
  },
);

export const PATCH = withRoute(
  "PATCH /api/admin/activities/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const session = await requireActivityAccess(id);
    const edit = parse(activityUpdateSchema, await req.json());

    const { activity, existing, settled, pending } = await updateActivity(id, edit);
    const target = { targetType: "Activity" as const, targetId: activity.id };

    if (edit.published !== undefined && !!edit.published !== existing.published) {
      await logAction(
        session.username,
        edit.published ? "PUBLISH_ACTIVITY" : "UNPUBLISH_ACTIVITY",
        activity.title,
        {
          ...auditContext(session, req),
          ...target,
          before: { published: existing.published },
          after: { published: !!edit.published },
        },
      );
    }
    if (edit.isOpen !== undefined && !!edit.isOpen !== existing.isOpen) {
      await logAction(
        session.username,
        edit.isOpen ? "OPEN_ACTIVITY_REGISTRATION" : "CLOSE_ACTIVITY_REGISTRATION",
        activity.title,
        {
          ...auditContext(session, req),
          ...target,
          before: { isOpen: existing.isOpen },
          after: { isOpen: !!edit.isOpen },
        },
      );
    }
    if (settled) {
      await logAction(
        session.username,
        settled === "ACTIVE" ? "APPROVE_ACTIVITY_REGISTRATION" : "REJECT_ACTIVITY_REGISTRATION",
        `${activity.title} — ${pending}`,
        {
          ...auditContext(session, req),
          ...target,
          before: { pendingRegistrations: pending },
          after: { status: settled },
        },
      );
    }
    await logAction(session.username, "UPDATE_ACTIVITY", activity.title, {
      ...auditContext(session, req),
      ...target,
      before: existing,
      after: {
        title: activity.title,
        period: activity.period,
        capacity: activity.capacity,
        isOpen: activity.isOpen,
        autoApprove: activity.autoApprove,
        isTournament: activity.isTournament,
        showScorersAndCards: activity.showScorersAndCards,
        format: activity.format,
        isVolunteer: activity.isVolunteer,
        whatsappLink: activity.whatsappLink,
        startsAt: activity.startsAt,
        endsAt: activity.endsAt,
        withTime: activity.withTime,
      },
    });

    return NextResponse.json({ activity });
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/activities/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const session = await requireActivityAccess(id);

    const activity = await deleteActivity(id);

    await logAction(session.username, "DELETE_ACTIVITY", activity.title, {
      ...auditContext(session, req),
      targetType: "Activity",
      targetId: id,
      before: activity,
    });

    return NextResponse.json({ ok: true });
  },
);
