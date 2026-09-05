import { isSinglesSquad, type SquadSize } from "./squadSize";

export type EntrantKind = "team" | "player";

export function entrantKind(squad: SquadSize): EntrantKind {
  return isSinglesSquad(squad) ? "player" : "team";
}
