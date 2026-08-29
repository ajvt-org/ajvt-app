import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { accountOf } from "@/lib/memberAccount";
import { requireTeamAccess } from "@/lib/activityAccessServer";
import { withRoute } from "@/lib/route";
import { teamIsFull } from "@/lib/teamSize";
import { logAction, auditContext } from "@/lib/audit";
import { parse } from "@/lib/validation";
import { teamMemberSchema } from "@/app/api/teams/[teamId]/join/schema";
import { members, tournament } from "@/lib/messages";
import { nameOf } from "@/lib/person";

export const POST = withRoute(
  "POST /api/admin/teams/[teamId]/members",
  async (req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) => {
    const { teamId } = await params;
    const session = await requireTeamAccess(teamId);
    const { memberId } = parse(teamMemberSchema, await req.json());

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { activity: { select: { teamSize: true } }, _count: { select: { members: true } } },
    });
    if (!team) {
      return NextResponse.json({ error: tournament.teamNotFound }, { status: 404 });
    }

    const teamSize = team.activity.teamSize;
    if (teamIsFull(team._count.members, teamSize)) {
      return NextResponse.json(
        { error: `هذا الفريق مكتمل — الحد الأقصى ${teamSize} لاعبين` },
        { status: 409 },
      );
    }

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { status: true, user: { select: { fullName: true } } },
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
      data: { teamId, memberId, userId: await accountOf(prisma, memberId) },
      select: {
        id: true,
        member: {
          select: { id: true, user: { select: { phone: true, fullName: true, age: true } } },
        },
      },
    });

    await logAction(
      session.username,
      "ADD_TEAM_MEMBER",
      `${nameOf(teamMember.member.user)} → ${team.name}`,
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
