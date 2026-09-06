import type { TournamentFormat } from "@prisma/client";

export function hasStandings(format: TournamentFormat | null): boolean {
  return format !== "KNOCKOUT";
}
