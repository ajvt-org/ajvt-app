import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { sortUpcoming, sortPast, splitFixtures, type Fixture } from "@/lib/memberFixtures";
import { anySideIs, matchSideTeams } from "@/lib/matchSides";

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

export const GET = withRoute("GET /api/user/matches", async () => {
  const session = await requireUser();

  const teamIds = (
    await prisma.teamMember.findMany({
      where: { status: "ACTIVE", userId: session.userId },
      select: { teamId: true },
    })
  ).map((t) => t.teamId);

  if (teamIds.length === 0) {
    return NextResponse.json({ teamCount: 0, upcoming: [], past: [] });
  }

  const matches = await prisma.match.findMany({
    where: anySideIs(teamIds),
    select: MATCH_SELECT,
  });

  const fixtures: Fixture[] = matches.flatMap((m) => {
    const sides = matchSideTeams(m, m.activity.matchShape);
    if (sides.first === null || sides.second === null) return [];
    const first = sides.first;
    const second = sides.second;
    return [
      {
        id: m.id,
        matchDate: m.matchDate ? m.matchDate.toISOString() : null,
        round: m.round,
        venue: m.venue,
        status: m.status,
        isKnockout: m.isKnockout,
        firstTeam: first,
        secondTeam: second,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        homePenalties: m.homePenalties,
        awayPenalties: m.awayPenalties,
        activity: m.activity,
        myTeamId: teamIds.includes(first.id) ? first.id : second.id,
      },
    ];
  });

  const { upcoming, past } = splitFixtures(fixtures);

  return NextResponse.json({
    teamCount: teamIds.length,
    upcoming: sortUpcoming(upcoming),
    past: sortPast(past),
  });
});
