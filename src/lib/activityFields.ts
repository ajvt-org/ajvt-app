import type { MatchShape, TournamentFormat } from "@prisma/client";
import { activities } from "./messages";

export interface NewActivity {
  title: string;
  description: string;
  period?: string | null;
  photo?: string | null;
  capacity?: number | null;
  isTournament?: unknown;
  format?: TournamentFormat | null;
  matchShape?: MatchShape | null;
  minTeamSize?: unknown;
  maxTeamSize?: unknown;
  organisedByHomeVillage?: boolean;
  playersBuildTeams?: boolean;
  outsidePlayerLimit?: unknown;
  isVolunteer?: unknown;
  whatsappLink?: string | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  withTime?: unknown;
}

export interface ActivityEdit {
  title?: string;
  description?: string;
  period?: string | null;
  capacity?: number | null;
  isOpen?: unknown;
  autoApprove?: unknown;
  photo?: string | null;
  isTournament?: unknown;
  showScorersAndCards?: unknown;
  format?: TournamentFormat | null;
  matchShape?: MatchShape;
  hasColours?: boolean;
  firstColourWord?: string | null;
  secondColourWord?: string | null;
  minTeamSize?: unknown;
  maxTeamSize?: unknown;
  organisedByHomeVillage?: boolean;
  playersBuildTeams?: boolean;
  outsidePlayerLimit?: unknown;
  yellowsForBan?: number;
  redBanMatches?: number;
  mvpVoteMinutes?: number;
  isVolunteer?: unknown;
  published?: unknown;
  settlePending?: "accept" | "reject";
  whatsappLink?: string | null;
  order?: unknown;
  startsAt?: Date | null;
  endsAt?: Date | null;
  withTime?: unknown;
}

export interface ActivityData {
  title?: string;
  description?: string;
  period?: string | null;
  capacity?: number | null;
  isOpen?: boolean;
  autoApprove?: boolean;
  photo?: string | null;
  isTournament?: boolean;
  showScorersAndCards?: boolean;
  format?: TournamentFormat | null;
  matchShape?: MatchShape;
  hasColours?: boolean;
  firstColourWord?: string | null;
  secondColourWord?: string | null;
  minTeamSize?: number | null;
  maxTeamSize?: number | null;
  organisedByHomeVillage?: boolean;
  playersBuildTeams?: boolean;
  outsidePlayerLimit?: number | null;
  yellowsForBan?: number;
  redBanMatches?: number;
  mvpVoteMinutes?: number;
  isVolunteer?: boolean;
  published?: boolean;
  whatsappLink?: string | null;
  order?: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
  withTime?: boolean;
}

export function given<T extends object>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

export interface VolunteerShape {
  isTournament: boolean;
  isVolunteer: boolean;
  whatsappLink: string | null;
}

export function volunteerProblem(shape: VolunteerShape): string | null {
  if (shape.isTournament && shape.isVolunteer) return activities.tournamentAndVolunteer;
  if (shape.isVolunteer && !/^https?:\/\//.test(shape.whatsappLink?.trim() || "")) {
    return activities.whatsappRequired;
  }
  return null;
}

export function trimmed(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
