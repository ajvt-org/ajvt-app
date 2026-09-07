import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { requireUser } from "./auth";
import { ConflictError, ForbiddenError, NotFoundError } from "./errors";
import { getAppSettings } from "./settingsServer";
import { currentMembership } from "./currentMembershipServer";
import { asMembershipState } from "./currentMembership";
import { membershipState } from "./membershipState";
import { playersMayBuildTeams } from "./teamBuilding";
import { membershipIsLocked } from "./teamLock";
import { isMember, isRequest } from "./teamInvites";
import { entrantWording, members, tournament } from "./messages";
import { entrantOf } from "./entrantServer";

const TOURNAMENT = {
  id: true,
  isTournament: true,
  minTeamSize: true,
  maxTeamSize: true,
  playersBuildTeams: true,
  startsAt: true,
} as const;

export type BuildableTournament = {
  id: string;
  isTournament: boolean;
  minTeamSize: number | null;
  maxTeamSize: number | null;
  playersBuildTeams: boolean;
  startsAt: Date | null;
};

export interface TeamBuilder {
  userId: string;
  activity: BuildableTournament;
}

export async function requireTeamBuilder(activityId: string): Promise<TeamBuilder> {
  const session = await requireUser();

  const membership = await currentMembership(prisma, session.userId);
  if (!membership) throw new NotFoundError(members.notFound);
  if (membership.status !== "ACTIVE") throw new ForbiddenError(tournament.joinNeedsMembership);

  const { membershipYear } = await getAppSettings();
  if (membershipState(asMembershipState(membership), membershipYear) === "ENDED") {
    throw new ForbiddenError(tournament.joinMembershipEnded);
  }

  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: TOURNAMENT,
  });
  if (!activity) throw new NotFoundError(tournament.teamNotFound);
  if (!playersMayBuildTeams(activity)) throw new ForbiddenError(tournament.teamsArrangedByAdmin);

  const registered = await prisma.activityRegistration.findUnique({
    where: { userId_activityId: { userId: session.userId, activityId } },
    select: { status: true },
  });
  if (!registered || registered.status !== "ACTIVE") {
    throw new ForbiddenError(tournament.joinNeedsRegistration);
  }

  return { userId: session.userId, activity };
}

export async function refuseSecondTeam(activityId: string, userId: string) {
  const seats = await prisma.teamMember.findMany({
    where: { userId, team: { activityId } },
    select: { status: true, invitedByCaptain: true, team: { select: { name: true } } },
  });
  const taken = seats.find((seat) => isMember(seat) || isRequest(seat));
  if (taken) throw new ConflictError(tournament.oneTeamPerRegistrant(taken.team.name));
}

export async function clearOtherSeats(
  tx: Prisma.TransactionClient,
  activityId: string,
  userId: string,
  keepTeamId: string,
) {
  await tx.teamMember.deleteMany({
    where: { userId, teamId: { not: keepTeamId }, team: { activityId } },
  });
}

export function refuseWhenLocked(activity: BuildableTournament, now = new Date()) {
  if (membershipIsLocked(activity, now)) {
    throw new ForbiddenError(entrantWording(entrantOf(activity)).entrantChoiceLocked);
  }
}

export async function requireCaptainOf(teamId: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { id: true, name: true, activityId: true, captainUserId: true },
  });
  if (!team) throw new NotFoundError(tournament.teamNotFound);

  const { userId, activity } = await requireTeamBuilder(team.activityId);
  if (team.captainUserId !== userId) throw new ForbiddenError(tournament.captainOnly);
  refuseWhenLocked(activity);

  return { userId, activity, team };
}
