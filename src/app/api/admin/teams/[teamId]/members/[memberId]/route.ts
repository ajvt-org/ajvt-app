import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTeamAccess } from "@/lib/activityAccessServer";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { members } from "@/lib/messages";

export const PATCH = withRoute(
  "PATCH /api/admin/teams/[teamId]/members/[memberId]",
  async (
    req: NextRequest,
    { params }: { params: Promise<{ teamId: string; memberId: string }> },
  ) => {
    const { teamId, memberId } = await params;
    const session = await requireTeamAccess(teamId);

    const existing = await prisma.teamMember.findUnique({
      where: { teamId_memberId: { teamId, memberId } },
      select: {
        id: true,
        status: true,
        team: { select: { name: true } },
        member: { select: { user: { select: { fullName: true } } } },
      },
    });
    if (!existing) {
      return NextResponse.json({ error: members.requestNotFound }, { status: 404 });
    }

    const teamMember = await prisma.teamMember.update({
      where: { id: existing.id },
      data: { status: "ACTIVE" },
    });
    await logAction(
      session.username,
      "APPROVE_TEAM_JOIN",
      `${existing.member.user.fullName} — ${existing.team.name}`,
      {
        ...auditContext(session, req),
        targetType: "TeamMember",
        targetId: existing.id,
        before: { status: existing.status },
        after: { status: teamMember.status },
      },
    );

    return NextResponse.json({ teamMember });
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/teams/[teamId]/members/[memberId]",
  async (
    req: NextRequest,
    { params }: { params: Promise<{ teamId: string; memberId: string }> },
  ) => {
    const { teamId, memberId } = await params;
    const session = await requireTeamAccess(teamId);

    const existing = await prisma.teamMember.findUnique({
      where: { teamId_memberId: { teamId, memberId } },
      select: {
        id: true,
        status: true,
        team: { select: { name: true } },
        member: { select: { user: { select: { fullName: true } } } },
      },
    });
    if (!existing) {
      return NextResponse.json({ error: members.requestNotFound }, { status: 404 });
    }

    await prisma.teamMember.delete({ where: { id: existing.id } });
    await logAction(
      session.username,
      "REMOVE_TEAM_MEMBER",
      `${existing.member.user.fullName} — ${existing.team.name}`,
      {
        ...auditContext(session, req),
        targetType: "TeamMember",
        targetId: existing.id,
        before: { teamId, memberId, status: existing.status },
      },
    );

    return NextResponse.json({ ok: true });
  },
);
