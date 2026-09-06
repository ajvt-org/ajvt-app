import { isSinglesSquad, squadOf, type SquadSize } from "./squadSize";

export type EntrantKind = "team" | "player";

export interface EntrantActivity {
  isTournament: boolean;
  minTeamSize: number | null;
  maxTeamSize: number | null;
}

export function entrantKind(squad: SquadSize): EntrantKind {
  return isSinglesSquad(squad) ? "player" : "team";
}

export function isSinglesActivity(activity: EntrantActivity): boolean {
  return activity.isTournament && isSinglesSquad(squadOf(activity));
}
