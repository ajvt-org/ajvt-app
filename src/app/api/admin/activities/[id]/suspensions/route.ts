import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActivityAccess } from "@/lib/activityAccessServer";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { logAction, auditContext } from "@/lib/audit";
import { listSuspensions, proposeSuspension } from "@/lib/suspensionServer";
import { suspensionCreateSchema } from "./schema";

export const GET = withRoute(
  "GET /api/admin/activities/[id]/suspensions",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    await requireActivityAccess(id);
    const [suspensions, rules] = await Promise.all([
      listSuspensions(id),
      prisma.activity.findUniqueOrThrow({
        where: { id },
        select: { yellowsForBan: true, redBanMatches: true },
      }),
    ]);
    return NextResponse.json({ suspensions, rules });
  },
);

export const POST = withRoute(
  "POST /api/admin/activities/[id]/suspensions",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const session = await requireActivityAccess(id);
    const { userId, scope, matches, until, note } = parse(suspensionCreateSchema, await req.json());
    const suspension = await proposeSuspension(
      id,
      { userId, scope, matches: matches ?? null, until: until ?? null, note: note ?? null },
      session.username,
    );
    await logAction(session.username, "PROPOSE_SUSPENSION", suspension.userId, {
      ...auditContext(session, req),
      targetType: "Suspension",
      targetId: suspension.id,
      after: { userId, scope, matches: matches ?? null, until: until ?? null },
    });
    return NextResponse.json({ suspension }, { status: 201 });
  },
);
