export type EntrantKind = "team" | "player";

export function entrantKind(teamSize: number | null | undefined): EntrantKind {
  return teamSize === 1 ? "player" : "team";
}
