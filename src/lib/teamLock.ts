import { playersMayBuildTeams, type TeamBuildingActivity } from "./teamBuilding";

export type LockedTournament = TeamBuildingActivity & { startsAt: Date | null };

export function membershipIsLocked(activity: LockedTournament, now: Date): boolean {
  if (!playersMayBuildTeams(activity)) return true;
  if (activity.startsAt === null) return false;
  return activity.startsAt.getTime() <= now.getTime();
}
