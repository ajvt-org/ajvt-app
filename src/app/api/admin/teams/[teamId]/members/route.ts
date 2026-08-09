import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    await requireAdmin();
    const { teamId } = await params;
    const { memberId } = await req.json();

    if (!memberId) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      return NextResponse.json({ error: "الفريق غير موجود" }, { status: 404 });
    }

    const member = await prisma.member.findUnique({ where: { id: memberId }, select: { status: true, fullName: true } });
    if (!member) {
      return NextResponse.json({ error: "العضو غير موجود" }, { status: 404 });
    }
    if (member.status !== "ACTIVE") {
      return NextResponse.json({ error: "يجب أن تكون عضوية اللاعب مقبولة" }, { status: 400 });
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
        { error: `هذا العضو منضم بالفعل إلى فريق "${existingMembership.team.name}" في هذه البطولة` },
        { status: 409 }
      );
    }

    const teamMember = await prisma.teamMember.create({
      data: { teamId, memberId },
      select: { id: true, member: { select: { id: true, fullName: true, phone: true, age: true } } },
    });

    return NextResponse.json({ teamMember }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    console.error("Team member add error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
