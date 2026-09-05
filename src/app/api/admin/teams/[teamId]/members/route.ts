import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTeamAccess } from "@/lib/activityAccessServer";
import { withRoute } from "@/lib/route";
import { squadOf, teamIsFull } from "@/lib/teamSize";
import { logAction, auditContext } from "@/lib/audit";
import { parse } from "@/lib/validation";
import { teamMemberSchema } from "@/app/api/teams/[teamId]/join/schema";
import { members, tournament } from "@/lib/messages";
import { nameOf } from "@/lib/person";
import { currentMembership } from "@/lib/currentMembershipServer";

export const POST = withRoute(
  "POST /api/admin/teams/[teamId]/members",
  async (req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) => {
    const { teamId } = await params;
    const session = await requireTeamAccess(teamId);
    const { userId } = parse(teamMemberSchema, await req.json());

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        activity: { select: { minTeamSize: true, maxTeamSize: true } },
        _count: { select: { members: true } },
      },
    });
    if (!team) {
      return NextResponse.json({ error: tournament.teamNotFound }, { status: 404 });
    }

    const squad = squadOf(team.activity);
    if (teamIsFull(team._count.members, squad)) {
      return NextResponse.json({ error: tournament.teamFull(squad.max) }, { status: 409 });
    }

    const membership = await currentMembership(prisma, userId);
    if (!membership) {
      return NextResponse.json({ error: members.notFound }, { status: 404 });
    }
    if (membership.status === "REJECTED") {
      return NextResponse.json({ error: tournament.playerRejected }, { status: 400 });
    }

    const registered = await prisma.activityRegistration.findUnique({
      where: { userId_activityId: { userId, activityId: team.activityId } },
    });
    if (!registered) {
      return NextResponse.json({ error: tournament.playerNotRegistered }, { status: 400 });
    }

    const existingMembership = await prisma.teamMember.findFirst({
      where: { userId, team: { activityId: team.activityId } },
      select: { team: { select: { name: true } } },
    });
    if (existingMembership) {
      return NextResponse.json(
        { error: tournament.playerInAnotherTeam(existingMembership.team.name) },
        { status: 409 },
      );
    }

    const teamMember = await prisma.teamMember.create({
      data: { teamId, userId },
      select: {
        id: true,
        user: { select: { phone: true, fullName: true, age: true } },
      },
    });

    await logAction(
      session.username,
      "ADD_TEAM_MEMBER",
      `${nameOf(teamMember.user)} → ${team.name}`,
      {
        ...auditContext(session, req),
        targetType: "TeamMember",
        targetId: teamMember.id,
        after: { teamId, userId, teamName: team.name },
      },
    );

    return NextResponse.json({ teamMember }, { status: 201 });
  },
);
