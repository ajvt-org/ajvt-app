import { prisma } from "./prisma";
import { isMember } from "./teamInvites";
import { tournament } from "./messages";
import { ConflictError } from "./errors";

export async function refuseWhenCaptainElsewhere(
  activityId: string,
  userId: string,
  joiningTeamId: string,
) {
  const elsewhere = await prisma.teamMember.findFirst({
    where: { userId, teamId: { not: joiningTeamId }, team: { activityId } },
    select: { status: true, invitedByCaptain: true, teamId: true },
  });
  if (!elsewhere || !isMember(elsewhere)) return;

  const leaving = await prisma.team.findUnique({
    where: { id: elsewhere.teamId },
    select: { captainUserId: true },
  });
  if (leaving?.captainUserId === userId) {
    throw new ConflictError(tournament.captainCannotLeave);
  }
}
