import { prisma } from "./prisma";
import { ConflictError, NotFoundError, ValidationError } from "./errors";
import { entrantWording, tournament } from "./messages";
import { entrantOf } from "./entrantServer";
import { activeCount, isInvitation, isMember } from "./teamInvites";
import { squadOf, teamIsFull } from "./squadSize";
import { clearOtherSeats } from "./teamBuildingServer";
import { refuseWhenCaptainElsewhere } from "./teamMoveServer";

interface SquadActivity {
  id: string;
  minTeamSize: number | null;
  maxTeamSize: number | null;
}

export async function rosterOf(teamId: string) {
  return prisma.teamMember.findMany({
    where: { teamId },
    select: { userId: true, status: true, invitedByCaptain: true },
  });
}

async function refuseWhenFull(teamId: string, activity: SquadActivity): Promise<void> {
  const squad = squadOf(activity);
  if (teamIsFull(activeCount(await rosterOf(teamId)), squad)) {
    throw new ConflictError(entrantWording(entrantOf(activity)).entrantFull(squad.max));
  }
}

export async function inviteToTeam(teamId: string, userId: string, activity: SquadActivity) {
  const roster = await rosterOf(teamId);
  const squad = squadOf(activity);
  if (teamIsFull(activeCount(roster), squad)) {
    throw new ConflictError(entrantWording(entrantOf(activity)).entrantFull(squad.max));
  }

  const seat = roster.find((row) => row.userId === userId);
  if (seat && isMember(seat)) throw new ConflictError(tournament.alreadyOnThisTeam);

  const registered = await prisma.activityRegistration.findUnique({
    where: { userId_activityId: { userId, activityId: activity.id } },
    select: { status: true },
  });
  if (!registered || registered.status !== "ACTIVE") {
    throw new ValidationError(tournament.inviteeNotRegistered);
  }

  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId, userId } },
    create: { teamId, userId, status: "PENDING", invitedByCaptain: true },
    update: { invitedByCaptain: true },
  });
}

export async function teamOrNotFound(teamId: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true, activityId: true },
  });
  if (!team) throw new NotFoundError(tournament.teamNotFound);
  return team;
}

export async function answerInvitation(
  teamId: string,
  userId: string,
  activity: SquadActivity,
  accept: boolean,
): Promise<void> {
  const seat = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
    select: { id: true, status: true, invitedByCaptain: true },
  });
  if (!seat || !isInvitation(seat)) throw new NotFoundError(tournament.invitationNotFound);

  if (!accept) {
    await prisma.teamMember.delete({ where: { id: seat.id } });
    return;
  }

  await refuseWhenCaptainElsewhere(activity.id, userId, teamId);
  await refuseWhenFull(teamId, activity);

  await prisma.$transaction(async (tx) => {
    await tx.teamMember.update({ where: { id: seat.id }, data: { status: "ACTIVE" } });
    await clearOtherSeats(tx, activity.id, userId, teamId);
  });
}
