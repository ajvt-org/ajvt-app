import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

// Players can pick their own team once their registration for that
// tournament is approved — switching teams just moves the membership,
// admin can still override anything from the tournament admin screen.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = await requireUser();
    const { teamId } = await params;
    const { memberId } = await req.json();

    if (!memberId) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    const [member, team] = await Promise.all([
      prisma.member.findUnique({ where: { id: memberId }, select: { userId: true, status: true } }),
      prisma.team.findUnique({ where: { id: teamId }, select: { id: true, activityId: true } }),
    ]);
    if (!member || member.userId !== session.userId) {
      return NextResponse.json({ error: "العضو غير موجود" }, { status: 404 });
    }
    if (member.status !== "ACTIVE") {
      return NextResponse.json({ error: "يجب أن تكون العضوية مقبولة أولاً" }, { status: 403 });
    }
    if (!team) {
      return NextResponse.json({ error: "الفريق غير موجود" }, { status: 404 });
    }

    const registered = await prisma.activityRegistration.findUnique({
      where: { memberId_activityId: { memberId, activityId: team.activityId } },
    });
    if (!registered || registered.status !== "ACTIVE") {
      return NextResponse.json({ error: "يجب أن يكون تسجيلك في هذا النشاط مقبولاً أولاً" }, { status: 403 });
    }

    const existingMembership = await prisma.teamMember.findFirst({
      where: { memberId, team: { activityId: team.activityId } },
      select: { id: true, teamId: true },
    });
    if (existingMembership?.teamId === teamId) {
      return NextResponse.json({ ok: true });
    }

    await prisma.$transaction(async (tx) => {
      if (existingMembership) {
        await tx.teamMember.delete({ where: { id: existingMembership.id } });
      }
      await tx.teamMember.create({ data: { teamId, memberId } });
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    console.error("Team self-join error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const session = await requireUser();
    const { teamId } = await params;
    const { memberId } = await req.json();

    if (!memberId) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

    const member = await prisma.member.findUnique({ where: { id: memberId }, select: { userId: true } });
    if (!member || member.userId !== session.userId) {
      return NextResponse.json({ error: "العضو غير موجود" }, { status: 404 });
    }

    await prisma.teamMember.deleteMany({ where: { teamId, memberId } });

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    console.error("Team self-leave error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
