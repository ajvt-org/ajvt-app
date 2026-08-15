import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { activities, tournament } from "@/lib/messages";

export const GET = withRoute(
  "GET /api/admin/activities/[id]/teams",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdminRole("ACTIVITIES");
    const { id } = await params;

    const teams = await prisma.team.findMany({
      where: { activityId: id },
      orderBy: { createdAt: "asc" },
      include: {
        group: { select: { id: true, name: true } },
        members: {
          select: {
            id: true,
            status: true,
            member: { select: { id: true, fullName: true, phone: true, age: true, photo: true } },
          },
        },
      },
    });

    return NextResponse.json({ teams });
  },
);

export const POST = withRoute(
  "POST /api/admin/activities/[id]/teams",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("ACTIVITIES");
    const { id } = await params;
    const { name, groupId, logo } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: tournament.teamNameRequired }, { status: 400 });
    }
    if (name.trim().length > 40) {
      return NextResponse.json({ error: tournament.teamNameTooLong }, { status: 400 });
    }

    const activity = await prisma.activity.findUnique({
      where: { id },
      select: { isTournament: true },
    });
    if (!activity?.isTournament) {
      return NextResponse.json({ error: activities.notATournament }, { status: 400 });
    }

    if (groupId) {
      const group = await prisma.group.findFirst({ where: { id: groupId, activityId: id } });
      if (!group) {
        return NextResponse.json({ error: tournament.groupNotFound }, { status: 400 });
      }
    }

    const team = await prisma.team.create({
      data: { activityId: id, name: name.trim(), groupId: groupId || null, logo: logo || null },
    });

    await logAction(session.username, "CREATE_TEAM", team.name, {
      ...auditContext(session, req),
      targetType: "Team",
      targetId: team.id,
      after: { name: team.name, activityId: id, groupId: team.groupId },
    });

    return NextResponse.json({ team }, { status: 201 });
  },
);
