import { NextRequest, NextResponse } from "next/server";
import { requireActivityAccess } from "@/lib/activityAccessServer";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { logAction, auditContext } from "@/lib/audit";
import { decideSuspension, liftSuspension } from "@/lib/suspensionServer";
import { suspensionDecideSchema } from "../schema";

export const PATCH = withRoute(
  "PATCH /api/admin/activities/[id]/suspensions/[suspensionId]",
  async (
    req: NextRequest,
    { params }: { params: Promise<{ id: string; suspensionId: string }> },
  ) => {
    const { id, suspensionId } = await params;
    const session = await requireActivityAccess(id);
    const { approve } = parse(suspensionDecideSchema, await req.json());
    const suspension = await decideSuspension(id, suspensionId, approve, session.username);
    await logAction(
      session.username,
      approve ? "APPROVE_SUSPENSION" : "DISMISS_SUSPENSION",
      suspensionId,
      { ...auditContext(session, req), targetType: "Suspension", targetId: suspensionId },
    );
    return NextResponse.json({ suspension });
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/activities/[id]/suspensions/[suspensionId]",
  async (
    req: NextRequest,
    { params }: { params: Promise<{ id: string; suspensionId: string }> },
  ) => {
    const { id, suspensionId } = await params;
    const session = await requireActivityAccess(id);
    const suspension = await liftSuspension(id, suspensionId, session.username);
    await logAction(session.username, "LIFT_SUSPENSION", suspensionId, {
      ...auditContext(session, req),
      targetType: "Suspension",
      targetId: suspensionId,
    });
    return NextResponse.json({ suspension });
  },
);
