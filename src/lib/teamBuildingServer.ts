import { prisma } from "./prisma";
import { requireUser } from "./auth";
import { ConflictError, ForbiddenError, NotFoundError } from "./errors";
import { getAppSettings } from "./settingsServer";
import { currentMembership } from "./currentMembershipServer";
import { asMembershipState } from "./currentMembership";
import { membershipState } from "./membershipState";
import { playersMayBuildTeams } from "./teamBuilding";
import { members, tournament } from "./messages";

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

export async function requireNoTeamYet(activityId: string, userId: string) {
  const seat = await prisma.teamMember.findFirst({
    where: { userId, team: { activityId } },
    select: { team: { select: { name: true } } },
  });
  if (seat) throw new ConflictError(tournament.oneTeamPerRegistrant(seat.team.name));
}
