import { isSinglesActivity, type EntrantActivity } from "./entrant";

export type TeamBuildingActivity = EntrantActivity & { playersBuildTeams: boolean };

export function playersMayBuildTeams(activity: TeamBuildingActivity): boolean {
  return activity.playersBuildTeams && activity.isTournament && !isSinglesActivity(activity);
}
