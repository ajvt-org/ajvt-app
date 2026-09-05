import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTeamAccess } from "@/lib/activityAccessServer";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { tournament } from "@/lib/messages";
import { captainIsOnTheRoster } from "@/lib/teamCaptainServer";

export const PATCH = withRoute(
  "PATCH /api/admin/teams/[teamId]",
  async (req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) => {
    const { teamId } = await params;
    const session = await requireTeamAccess(teamId);
    const { name, groupId, logo, captainUserId, fromTaguilalett } = await req.json();

    const existing = await prisma.team.findUnique({ where: { id: teamId } });
    if (!existing) {
      return NextResponse.json({ error: tournament.teamNotFound }, { status: 404 });
    }

    const data: {
      name?: string;
      groupId?: string | null;
      logo?: string | null;
      captainUserId?: string | null;
      fromTaguilalett?: boolean;
    } = {};

    if (name !== undefined) {
      if (!name.trim())
        return NextResponse.json({ error: tournament.teamNameRequired }, { status: 400 });
      if (name.trim().length > 40)
        return NextResponse.json({ error: tournament.teamNameTooLong }, { status: 400 });
      data.name = name.trim();
    }
    if (groupId !== undefined) {
      const newGroupId = groupId || null;
      if (newGroupId) {
        const group = await prisma.group.findFirst({
          where: { id: newGroupId, activityId: existing.activityId },
        });
        if (!group) return NextResponse.json({ error: tournament.groupNotFound }, { status: 400 });
      }

      if (newGroupId !== existing.groupId) {
        const hasMatches = await prisma.match.findFirst({
          where: {
            activityId: existing.activityId,
            OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
          },
          select: { id: true },
        });
        if (hasMatches) {
          return NextResponse.json(
            {
              error:
                "لا يمكن تغيير مجموعة فريق لديه مباريات مسجَّلة بالفعل — احذف مباريات هذا الفريق أولاً ثم أعد التوليد",
            },
            { status: 409 },
          );
        }
      }
      data.groupId = newGroupId;
    }
    if (logo !== undefined) {
      data.logo = logo || null;
    }
    if (captainUserId !== undefined) {
      const nextCaptain = captainUserId || null;
      if (nextCaptain && !(await captainIsOnTheRoster(prisma, teamId, nextCaptain))) {
        return NextResponse.json({ error: tournament.captainNotInTeam }, { status: 400 });
      }
      data.captainUserId = nextCaptain;
    }
    if (fromTaguilalett !== undefined) {
      data.fromTaguilalett = !!fromTaguilalett;
    }

    const team = await prisma.team.update({ where: { id: teamId }, data });
    await logAction(session.username, "UPDATE_TEAM", team.name, {
      ...auditContext(session, req),
      targetType: "Team",
      targetId: team.id,
      before: existing,
      after: {
        name: team.name,
        groupId: team.groupId,
        logo: team.logo,
        captainUserId: team.captainUserId,
        fromTaguilalett: team.fromTaguilalett,
      },
    });

    return NextResponse.json({ team });
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/teams/[teamId]",
  async (req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) => {
    const { teamId } = await params;
    const session = await requireTeamAccess(teamId);

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      return NextResponse.json({ error: tournament.teamNotFound }, { status: 404 });
    }

    await prisma.team.delete({ where: { id: teamId } });
    await logAction(session.username, "DELETE_TEAM", team.name, {
      ...auditContext(session, req),
      targetType: "Team",
      targetId: teamId,
      before: team,
    });

    return NextResponse.json({ ok: true });
  },
);
