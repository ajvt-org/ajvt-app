import { prisma } from "./prisma";
import { ConflictError, ForbiddenError, NotFoundError } from "./errors";
import { entrantWording, tournament } from "./messages";
import { entrantOf } from "./entrantServer";
import { releaseCaptain } from "./teamCaptainServer";
import { playersMayBuildTeams } from "./teamBuilding";
import { membershipIsLocked } from "./teamLock";
import { isMember } from "./teamInvites";

const TOURNAMENT = {
  isTournament: true,
  minTeamSize: true,
  maxTeamSize: true,
  playersBuildTeams: true,
  startsAt: true,
} as const;

export async function joinTeam(
  teamId: string,
  activityId: string,
  userId: string,
): Promise<{ alreadyThere: boolean }> {
  const seat = await prisma.teamMember.findFirst({
    where: { userId, team: { activityId } },
    select: { id: true, teamId: true, status: true, invitedByCaptain: true },
  });
  if (seat?.teamId === teamId) return { alreadyThere: true };

  if (seat && isMember(seat)) {
    const leaving = await prisma.team.findUnique({
      where: { id: seat.teamId },
      select: { captainUserId: true },
    });
    if (leaving?.captainUserId === userId) throw new ConflictError(tournament.captainCannotLeave);
  }

  await prisma.$transaction(async (tx) => {
    if (seat) {
      await releaseCaptain(tx, seat.teamId, userId);
      await tx.teamMember.delete({ where: { id: seat.id } });
    }
    await tx.teamMember.create({ data: { teamId, userId, status: "PENDING" } });
  });

  return { alreadyThere: false };
}

export async function leaveTeam(teamId: string, userId: string): Promise<void> {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { captainUserId: true, activity: { select: TOURNAMENT } },
  });
  if (!team) throw new NotFoundError(tournament.teamNotFound);

  const seat = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
    select: { status: true, invitedByCaptain: true },
  });

  if (seat && isMember(seat)) {
    const words = entrantWording(entrantOf(team.activity));
    if (!playersMayBuildTeams(team.activity)) {
      throw new ForbiddenError(words.entrantChoiceSettled);
    }
    if (membershipIsLocked(team.activity, new Date())) {
      throw new ForbiddenError(words.entrantChoiceLocked);
    }
    if (team.captainUserId === userId) throw new ConflictError(tournament.captainCannotLeave);
  }

  await prisma.$transaction(async (tx) => {
    await releaseCaptain(tx, teamId, userId);
    await tx.teamMember.deleteMany({ where: { teamId, userId } });
  });
}
