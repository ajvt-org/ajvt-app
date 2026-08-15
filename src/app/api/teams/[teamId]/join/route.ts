import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { teamMemberSchema } from "./schema";
import { members, tournament } from "@/lib/messages";

// Players can pick their own team once their registration for that
// tournament is approved — switching teams just moves the membership,
// admin can still override anything from the tournament admin screen.
export const POST = withRoute(
  "POST /api/teams/[teamId]/join",
  async (req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) => {
    const session = await requireUser();
    const { teamId } = await params;
    const { memberId } = parse(teamMemberSchema, await req.json());

    const [member, team] = await Promise.all([
      prisma.member.findUnique({ where: { id: memberId }, select: { userId: true, status: true } }),
      prisma.team.findUnique({ where: { id: teamId }, select: { id: true, activityId: true } }),
    ]);
    if (!member || member.userId !== session.userId) {
      return NextResponse.json({ error: members.notFound }, { status: 404 });
    }
    if (member.status !== "ACTIVE") {
      return NextResponse.json({ error: "يجب أن تكون العضوية مقبولة أولاً" }, { status: 403 });
    }
    if (!team) {
      return NextResponse.json({ error: tournament.teamNotFound }, { status: 404 });
    }

    const registered = await prisma.activityRegistration.findUnique({
      where: { memberId_activityId: { memberId, activityId: team.activityId } },
    });
    if (!registered || registered.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "يجب أن يكون تسجيلك في هذا النشاط مقبولاً أولاً" },
        { status: 403 },
      );
    }

    const existingMembership = await prisma.teamMember.findFirst({
      where: { memberId, team: { activityId: team.activityId } },
      select: { id: true, teamId: true, status: true },
    });
    if (existingMembership?.teamId === teamId) {
      return NextResponse.json({ ok: true });
    }
    if (existingMembership?.status === "ACTIVE") {
      return NextResponse.json(
        { error: "لقد تم تأكيد اختيارك للفريق، لا يمكن تغييره" },
        { status: 403 },
      );
    }

    await prisma.$transaction(async (tx) => {
      if (existingMembership) {
        await tx.teamMember.delete({ where: { id: existingMembership.id } });
      }
      await tx.teamMember.create({ data: { teamId, memberId, status: "PENDING" } });
    });

    return NextResponse.json({ ok: true });
  },
);

export const DELETE = withRoute(
  "DELETE /api/teams/[teamId]/join",
  async (req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) => {
    const session = await requireUser();
    const { teamId } = await params;
    const { memberId } = parse(teamMemberSchema, await req.json());

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { userId: true },
    });
    if (!member || member.userId !== session.userId) {
      return NextResponse.json({ error: members.notFound }, { status: 404 });
    }

    const existing = await prisma.teamMember.findUnique({
      where: { teamId_memberId: { teamId, memberId } },
      select: { status: true },
    });
    if (existing?.status === "ACTIVE") {
      return NextResponse.json(
        { error: "لقد تم تأكيد اختيارك للفريق، لا يمكن تغييره" },
        { status: 403 },
      );
    }

    await prisma.teamMember.deleteMany({ where: { teamId, memberId } });

    return NextResponse.json({ ok: true });
  },
);
