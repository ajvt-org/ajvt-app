import { prisma } from "./prisma";
import { ConflictError, ValidationError } from "./errors";
import { entrantWording, tournament } from "./messages";
import { entrantOf } from "./entrantServer";
import { isMember } from "./teamInvites";
import { anySideIs } from "./matchSides";

interface SquadActivity {
  minTeamSize: number | null;
  maxTeamSize: number | null;
}

export async function handOverCaptaincy(
  teamId: string,
  captainUserId: string,
  activity: SquadActivity,
): Promise<void> {
  const seat = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId: captainUserId } },
    select: { status: true, invitedByCaptain: true },
  });
  if (!seat || !isMember(seat)) {
    throw new ValidationError(entrantWording(entrantOf(activity)).captainNotInEntrant);
  }

  await prisma.team.update({ where: { id: teamId }, data: { captainUserId } });
}

export async function deleteOwnTeam(teamId: string): Promise<void> {
  const played = await prisma.match.count({ where: anySideIs([teamId]) });
  if (played > 0) throw new ConflictError(tournament.teamHasMatches);

  await prisma.team.delete({ where: { id: teamId } });
}
