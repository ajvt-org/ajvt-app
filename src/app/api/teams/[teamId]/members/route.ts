import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { answerRequestSchema, removeMemberSchema } from "./schema";
import { clearOtherSeats, requireCaptainOf } from "@/lib/teamBuildingServer";
import { entrantWording, tournament } from "@/lib/messages";
import { entrantOf } from "@/lib/entrantServer";
import { activeCount, isMember, isRequest } from "@/lib/teamInvites";
import { squadOf, teamIsFull } from "@/lib/squadSize";

export const PATCH = withRoute(
  "PATCH /api/teams/[teamId]/members",
  async (req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) => {
    const { teamId } = await params;
    const { userId, accept } = parse(answerRequestSchema, await req.json());
    const { activity } = await requireCaptainOf(teamId);

    const seat = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
      select: { id: true, status: true, invitedByCaptain: true },
    });
    if (!seat || !isRequest(seat)) {
      return NextResponse.json({ error: tournament.requestNotFound }, { status: 404 });
    }

    if (!accept) {
      await prisma.teamMember.delete({ where: { id: seat.id } });
      return NextResponse.json({ ok: true });
    }

    const words = entrantWording(entrantOf(activity));
    const elsewhere = await prisma.teamMember.findFirst({
      where: { userId, teamId: { not: teamId }, team: { activityId: activity.id } },
      select: { status: true, invitedByCaptain: true },
    });
    if (elsewhere && isMember(elsewhere)) {
      return NextResponse.json({ error: words.entrantChoiceLocked }, { status: 403 });
    }

    const roster = await prisma.teamMember.findMany({
      where: { teamId },
      select: { status: true, invitedByCaptain: true },
    });
    const squad = squadOf(activity);
    if (teamIsFull(activeCount(roster), squad)) {
      return NextResponse.json({ error: words.entrantFull(squad.max) }, { status: 409 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.teamMember.update({ where: { id: seat.id }, data: { status: "ACTIVE" } });
      await clearOtherSeats(tx, activity.id, userId, teamId);
    });

    return NextResponse.json({ ok: true });
  },
);

export const DELETE = withRoute(
  "DELETE /api/teams/[teamId]/members",
  async (req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) => {
    const { teamId } = await params;
    const { userId } = parse(removeMemberSchema, await req.json());
    const { userId: captainId } = await requireCaptainOf(teamId);

    if (userId === captainId) {
      return NextResponse.json({ error: tournament.captainCannotLeave }, { status: 409 });
    }

    const seat = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
      select: { id: true },
    });
    if (!seat) {
      return NextResponse.json({ error: tournament.playerNotInTeam }, { status: 404 });
    }

    await prisma.teamMember.delete({ where: { id: seat.id } });

    return NextResponse.json({ ok: true });
  },
);
