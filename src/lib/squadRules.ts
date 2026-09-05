import { HOME_VILLAGE } from "./villages";
import { rosterFault, type SquadSize } from "./squadSize";

export interface SquadPlayer {
  id: string;
  village: string;
}

export interface SquadSettings {
  squad: SquadSize;
  organisedByHomeVillage: boolean;
  outsidePlayerLimit: number | null;
}

export interface SquadTeam {
  fromHomeVillage: boolean;
}

export type SquadBreach =
  | { kind: "tooFew"; count: number; min: number }
  | { kind: "tooMany"; count: number; max: number }
  | { kind: "tooManyOutside"; count: number; limit: number; overPlayerIds: string[] };

export function isOutsidePlayer(village: string): boolean {
  return village.trim() !== HOME_VILLAGE;
}

export function outsideLimitApplies(team: SquadTeam, settings: SquadSettings): boolean {
  return (
    settings.organisedByHomeVillage && team.fromHomeVillage && settings.outsidePlayerLimit !== null
  );
}

export function squadBreaches(
  players: SquadPlayer[],
  team: SquadTeam,
  settings: SquadSettings,
): SquadBreach[] {
  const breaches: SquadBreach[] = [];
  const count = players.length;

  const fault = rosterFault(count, settings.squad);
  if (fault === "short" && settings.squad.min !== null) {
    breaches.push({ kind: "tooFew", count, min: settings.squad.min });
  }
  if (fault === "over" && settings.squad.max !== null) {
    breaches.push({ kind: "tooMany", count, max: settings.squad.max });
  }

  const limit = settings.outsidePlayerLimit;
  if (limit !== null && outsideLimitApplies(team, settings)) {
    const outside = players.filter((player) => isOutsidePlayer(player.village));
    if (outside.length > limit) {
      breaches.push({
        kind: "tooManyOutside",
        count: outside.length,
        limit,
        overPlayerIds: outside.slice(limit).map((player) => player.id),
      });
    }
  }

  return breaches;
}

export function playerOverOutsideLimit(breaches: SquadBreach[], playerId: string): boolean {
  return breaches.some(
    (breach) => breach.kind === "tooManyOutside" && breach.overPlayerIds.includes(playerId),
  );
}
