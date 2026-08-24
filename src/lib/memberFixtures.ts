export interface FixtureTeam {
  id: string;
  name: string;
}

export interface FixturesResponse {
  teamCount: number;
  upcoming: Fixture[];
  past: Fixture[];
}

export interface Fixture {
  id: string;
  matchDate: string | null;
  round: string | null;
  venue: string | null;
  status: string;
  isKnockout: boolean;
  homeTeam: FixtureTeam;
  awayTeam: FixtureTeam;
  homeScore: number | null;
  awayScore: number | null;
  homePenalties: number | null;
  awayPenalties: number | null;
  activity: { id: string; title: string };
  myTeamId: string;
}

export function isPast(fixture: Fixture): boolean {
  return fixture.status === "PLAYED";
}

export function splitFixtures(fixtures: Fixture[]): { upcoming: Fixture[]; past: Fixture[] } {
  return {
    upcoming: fixtures.filter((f) => !isPast(f)),
    past: fixtures.filter(isPast),
  };
}

export function sortUpcoming(fixtures: Fixture[]): Fixture[] {
  return [...fixtures].sort((a, b) => {
    if (!a.matchDate && !b.matchDate) return 0;
    if (!a.matchDate) return 1;
    if (!b.matchDate) return -1;
    return new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime();
  });
}

export function sortPast(fixtures: Fixture[]): Fixture[] {
  return [...fixtures].sort((a, b) => {
    if (!a.matchDate && !b.matchDate) return 0;
    if (!a.matchDate) return 1;
    if (!b.matchDate) return -1;
    return new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime();
  });
}

export function nextFixture(fixtures: Fixture[]): Fixture | null {
  return sortUpcoming(splitFixtures(fixtures).upcoming)[0] ?? null;
}

export type EmptyReason = "NO_TEAM" | "NO_FIXTURES";

export function emptyReason(teamCount: number): EmptyReason {
  return teamCount === 0 ? "NO_TEAM" : "NO_FIXTURES";
}
