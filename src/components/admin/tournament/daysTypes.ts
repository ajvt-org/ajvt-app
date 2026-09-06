import { CLUB_TIMEZONE } from "@/lib/clubTime";

export interface DayMatch {
  id: string;
  matchDate: string | null;
  round: string | null;
  venue: string | null;
  status: "SCHEDULED" | "PLAYED";
  homeScore: number | null;
  awayScore: number | null;
  homePenalties: number | null;
  awayPenalties: number | null;
  forfeitWinnerTeamId: string | null;
  firstTeam: { id: string; name: string } | null;
  secondTeam: { id: string; name: string } | null;
}

export interface TournamentDayRow {
  id: string;
  position: number;
  isRest: boolean;
  date: string | null;
  matches: DayMatch[];
}

export interface DaysPayload {
  startsAt: string | null;
  endsAt: string | null;
  days: TournamentDayRow[];
  unscheduled: DayMatch[];
}

export function dayLabel(date: string | null): string {
  if (!date) return "";
  return new Intl.DateTimeFormat("ar", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: CLUB_TIMEZONE,
  }).format(new Date(date));
}

export function sharedVenue(day: TournamentDayRow): string | null {
  const venues = day.matches.map((match) => match.venue?.trim() || null);
  if (venues.length === 0 || venues.some((venue) => venue === null)) return null;
  return venues.every((venue) => venue === venues[0]) ? venues[0] : null;
}

export function doubleBookedTeams(day: TournamentDayRow): string[] {
  const seen = new Map<string, string>();
  const twice = new Set<string>();
  for (const match of day.matches) {
    for (const team of [match.firstTeam, match.secondTeam]) {
      if (!team) continue;
      if (seen.has(team.id)) twice.add(team.name);
      seen.set(team.id, team.name);
    }
  }
  return [...twice];
}
