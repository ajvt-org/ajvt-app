import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { withRoute } from "@/lib/route";

export const POST = withRoute(
  "POST /api/admin/teams/[teamId]/members",
  async (req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) => {
    await requireAdminRole("ACTIVITIES");
    const { teamId } = await params;
    const { memberId } = await req.json();

    if (!memberId) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      return NextResponse.json({ error: "الفريق غير موجود" }, { status: 404 });
    }

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { status: true, fullName: true },
    });
    if (!member) {
      return NextResponse.json({ error: "العضو غير موجود" }, { status: 404 });
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
        member: { select: { id: true, fullName: true, phone: true, age: true } },
      },
    });

    return NextResponse.json({ teamMember }, { status: 201 });
  },
);
