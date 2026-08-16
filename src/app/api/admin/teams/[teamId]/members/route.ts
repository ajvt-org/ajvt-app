import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { logAction, auditContext } from "@/lib/audit";
import { parse } from "@/lib/validation";
import { teamMemberSchema } from "@/app/api/teams/[teamId]/join/schema";
import { members, tournament } from "@/lib/messages";

export const POST = withRoute(
  "POST /api/admin/teams/[teamId]/members",
  async (req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) => {
    const session = await requireAdminRole("ACTIVITIES");
    const { teamId } = await params;
    const { memberId } = parse(teamMemberSchema, await req.json());

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      return NextResponse.json({ error: tournament.teamNotFound }, { status: 404 });
    }

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { status: true, fullName: true },
    });
    if (!member) {
      return NextResponse.json({ error: members.notFound }, { status: 404 });
    }
    if (member.status === "REJECTED") {
      return NextResponse.json({ error: "لا يمكن إضافة لاعب طلبه مرفوض" }, { status: 400 });
    }

    const registered = await prisma.activityRegistration.findUnique({
      where: { memberId_activityId: { memberId, activityId: team.activityId } },
    });
    if (!registered) {
      return NextResponse.json({ error: "هذا العضو غير مسجل في هذه البطولة" }, { status: 400 });
    }

    const existingMembership = await prisma.teamMember.findFirst({
      where: { memberId, team: { activityId: team.activityId } },
      select: { team: { select: { name: true } } },
    });
    if (existingMembership) {
      return NextResponse.json(
        {
          error: `هذا العضو منضم بالفعل إلى فريق "${existingMembership.team.name}" في هذه البطولة`,
        },
        { status: 409 },
      );
    }

    const teamMember = await prisma.teamMember.create({
      data: { teamId, memberId },
      select: {
        id: true,
        member: {
          select: { id: true, fullName: true, age: true, user: { select: { phone: true } } },
        },
      },
    });

    await logAction(
      session.username,
      "ADD_TEAM_MEMBER",
      `${teamMember.member.fullName} → ${team.name}`,
      {
        ...auditContext(session, req),
        targetType: "TeamMember",
        targetId: teamMember.id,
        after: { teamId, memberId, teamName: team.name },
      },
    );

    return NextResponse.json({ teamMember }, { status: 201 });
  },
);
