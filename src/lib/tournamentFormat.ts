import type { TournamentFormat } from "@prisma/client";

// A knockout is a bracket and nothing else. It has no league table at any
// stage, so the panel is chosen from the format the tournament was set up
// with, never from how many matches happen to exist yet.
export function hasStandings(format: TournamentFormat | null): boolean {
  return format !== "KNOCKOUT";
}
