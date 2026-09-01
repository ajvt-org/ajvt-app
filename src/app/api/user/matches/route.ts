import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { sortUpcoming, sortPast, splitFixtures, type Fixture } from "@/lib/memberFixtures";

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
  homeTeam: { select: { id: true, name: true } },
  awayTeam: { select: { id: true, name: true } },
  activity: { select: { id: true, title: true } },
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
    where: { OR: [{ homeTeamId: { in: teamIds } }, { awayTeamId: { in: teamIds } }] },
    select: MATCH_SELECT,
  });

  const fixtures: Fixture[] = matches.flatMap((m) => {
    if (m.homeTeam === null || m.awayTeam === null) return [];
    const home = m.homeTeam;
    const away = m.awayTeam;
    return [
      {
        id: m.id,
        matchDate: m.matchDate ? m.matchDate.toISOString() : null,
        round: m.round,
        venue: m.venue,
        status: m.status,
        isKnockout: m.isKnockout,
        homeTeam: home,
        awayTeam: away,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        homePenalties: m.homePenalties,
        awayPenalties: m.awayPenalties,
        activity: m.activity,
        myTeamId: teamIds.includes(home.id) ? home.id : away.id,
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
