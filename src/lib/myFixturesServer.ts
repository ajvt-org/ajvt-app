import { prisma } from "./prisma";
import { anySideIs, matchSideTeams } from "./matchSides";
import { sortPast, sortUpcoming, splitFixtures, type Fixture } from "./memberFixtures";

const FIXTURE_SIDE = { select: { id: true, name: true } } as const;

const MATCH_SELECT = {
  id: true,
  matchDate: true,
  round: true,
  venue: true,
  status: true,
  isKnockout: true,
  homeScore: true,
  awayScore: true,
  homePenalties: true,
  awayPenalties: true,
  homeTeam: FIXTURE_SIDE,
  awayTeam: FIXTURE_SIDE,
  sideATeam: FIXTURE_SIDE,
  sideBTeam: FIXTURE_SIDE,
  activity: { select: { id: true, title: true, matchShape: true } },
} as const;

export async function fixturesForTeams(teamIds: string[]): Promise<Fixture[]> {
  if (teamIds.length === 0) return [];

  const matches = await prisma.match.findMany({ where: anySideIs(teamIds), select: MATCH_SELECT });

  return matches.flatMap((match) => {
    const sides = matchSideTeams(match, match.activity.matchShape);
    if (sides.first === null || sides.second === null) return [];
    const first = sides.first;
    const second = sides.second;
    return [
      {
        id: match.id,
        matchDate: match.matchDate ? match.matchDate.toISOString() : null,
        round: match.round,
        venue: match.venue,
        status: match.status,
        isKnockout: match.isKnockout,
        firstTeam: first,
        secondTeam: second,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        homePenalties: match.homePenalties,
        awayPenalties: match.awayPenalties,
        activity: match.activity,
        myTeamId: teamIds.includes(first.id) ? first.id : second.id,
      },
    ];
  });
}

export async function myMatches(userId: string) {
  const seats = await prisma.teamMember.findMany({
    where: { status: "ACTIVE", userId },
    select: { teamId: true },
  });
  const teamIds = seats.map((seat) => seat.teamId);
  if (teamIds.length === 0) return { teamCount: 0, upcoming: [], past: [] };

  const { upcoming, past } = splitFixtures(await fixturesForTeams(teamIds));

  return { teamCount: teamIds.length, upcoming: sortUpcoming(upcoming), past: sortPast(past) };
}
