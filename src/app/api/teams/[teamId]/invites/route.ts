import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { answerSchema, inviteSchema } from "./schema";
import { clearOtherSeats, requireCaptainOf, requireTeamBuilder } from "@/lib/teamBuildingServer";
import { entrantWording, tournament } from "@/lib/messages";
import { entrantOf } from "@/lib/entrantServer";
import { activeCount, isInvitation, isMember } from "@/lib/teamInvites";
import { squadOf, teamIsFull } from "@/lib/squadSize";
import { notifyTeamInvitation } from "@/lib/tournamentNotify";

async function rosterOf(teamId: string) {
  return prisma.teamMember.findMany({
    where: { teamId },
    select: { userId: true, status: true, invitedByCaptain: true },
  });
}

export const POST = withRoute(
  "POST /api/teams/[teamId]/invites",
  async (req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) => {
    const { teamId } = await params;
    const { userId } = parse(inviteSchema, await req.json());
    const { activity, team } = await requireCaptainOf(teamId);

    const roster = await rosterOf(teamId);
    const squad = squadOf(activity);
    const words = entrantWording(entrantOf(activity));
    if (teamIsFull(activeCount(roster), squad)) {
      return NextResponse.json({ error: words.entrantFull(squad.max) }, { status: 409 });
    }

    const seat = roster.find((row) => row.userId === userId);
    if (seat && isMember(seat)) {
      return NextResponse.json({ error: tournament.alreadyOnThisTeam }, { status: 409 });
    }

    const registered = await prisma.activityRegistration.findUnique({
      where: { userId_activityId: { userId, activityId: activity.id } },
      select: { status: true },
    });
    if (!registered || registered.status !== "ACTIVE") {
      return NextResponse.json({ error: tournament.inviteeNotRegistered }, { status: 400 });
    }

    await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId, userId } },
      create: { teamId, userId, status: "PENDING", invitedByCaptain: true },
      update: { invitedByCaptain: true },
    });

    await notifyTeamInvitation(userId, team.name, activity.id);

    return NextResponse.json({ ok: true }, { status: 201 });
  },
);

export const PATCH = withRoute(
  "PATCH /api/teams/[teamId]/invites",
  async (req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) => {
    const { teamId } = await params;
    const { accept } = parse(answerSchema, await req.json());

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, activityId: true },
    });
    if (!team) {
      return NextResponse.json({ error: tournament.teamNotFound }, { status: 404 });
    }

    const { userId, activity } = await requireTeamBuilder(team.activityId);

    const seat = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
      select: { id: true, status: true, invitedByCaptain: true },
    });
    if (!seat || !isInvitation(seat)) {
      return NextResponse.json({ error: tournament.invitationNotFound }, { status: 404 });
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

    const squad = squadOf(activity);
    if (teamIsFull(activeCount(await rosterOf(teamId)), squad)) {
      return NextResponse.json({ error: words.entrantFull(squad.max) }, { status: 409 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.teamMember.update({ where: { id: seat.id }, data: { status: "ACTIVE" } });
      await clearOtherSeats(tx, activity.id, userId, teamId);
    });

    return NextResponse.json({ ok: true });
  },
);
