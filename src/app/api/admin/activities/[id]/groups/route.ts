import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActivityAccess } from "@/lib/activityAccessServer";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { activities, tournament } from "@/lib/messages";

export const GET = withRoute(
  "GET /api/admin/activities/[id]/groups",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    await requireActivityAccess(id);

    const [groups, activity] = await Promise.all([
      prisma.group.findMany({ where: { activityId: id }, orderBy: { createdAt: "asc" } }),
      prisma.activity.findUnique({
        where: { id },
        select: { format: true, minTeamSize: true, maxTeamSize: true },
      }),
    ]);

    return NextResponse.json({
      groups,
      format: activity?.format ?? null,
      minTeamSize: activity?.minTeamSize ?? null,
      maxTeamSize: activity?.maxTeamSize ?? null,
    });
  },
);

export const POST = withRoute(
  "POST /api/admin/activities/[id]/groups",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const session = await requireActivityAccess(id);
    const { name, capacity } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: tournament.groupNameRequired }, { status: 400 });
    }
    if (name.trim().length > 40) {
      return NextResponse.json({ error: tournament.groupNameTooLong }, { status: 400 });
    }
    let capacityValue: number | null = null;
    if (capacity !== undefined && capacity !== null && capacity !== "") {
      capacityValue = Number(capacity);
      if (!Number.isInteger(capacityValue) || capacityValue < 2 || capacityValue > 64) {
        return NextResponse.json({ error: tournament.targetTeamsRange }, { status: 400 });
      }
    }

    const activity = await prisma.activity.findUnique({
      where: { id },
      select: { isTournament: true, format: true },
    });
    if (!activity?.isTournament) {
      return NextResponse.json({ error: activities.notATournament }, { status: 400 });
    }
    if (activity.format === "KNOCKOUT") {
      return NextResponse.json({ error: tournament.groupsNotInKnockout }, { status: 409 });
    }

    const group = await prisma.group.create({
      data: { activityId: id, name: name.trim(), capacity: capacityValue },
    });
    await logAction(session.username, "CREATE_GROUP", group.name, {
      ...auditContext(session, req),
      targetType: "Group",
      targetId: group.id,
      after: { name: group.name, activityId: id, capacity: group.capacity },
    });

    return NextResponse.json({ group }, { status: 201 });
  },
);
