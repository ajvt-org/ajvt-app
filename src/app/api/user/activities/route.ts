import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { anySideIs, matchSideTeams } from "@/lib/matchSides";

const FIXTURE_SIDE = { select: { id: true, name: true } } as const;
import { formatActivityDates } from "@/lib/activityDates";
import { buildActivityRows, type MemberActivity } from "@/lib/memberActivities";
import type { Fixture } from "@/lib/memberFixtures";
import { nameOf } from "@/lib/person";

const ACTIVITY_SELECT = {
  id: true,
  title: true,
  isTournament: true,
  isVolunteer: true,
  minTeamSize: true,
  maxTeamSize: true,
  startsAt: true,
  endsAt: true,
  withTime: true,
  period: true,
} as const;

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

export const GET = withRoute("GET /api/user/activities", async () => {
  const session = await requireUser();

  const [registrations, teamMemberships] = await Promise.all([
    prisma.activityRegistration.findMany({
      where: { userId: session.userId },
      select: { status: true, activity: { select: ACTIVITY_SELECT } },
    }),
    prisma.teamMember.findMany({
      where: { status: "ACTIVE", userId: session.userId },
      select: {
        userId: true,
        team: {
          select: {
            id: true,
            name: true,
            autoNamed: true,
            activity: { select: ACTIVITY_SELECT },
            members: {
              where: { status: "ACTIVE" },
              select: {
                userId: true,
                user: { select: { fullName: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  const teamIds = teamMemberships.map((t) => t.team.id);
  const matches = teamIds.length
    ? await prisma.match.findMany({
        where: anySideIs(teamIds),
        select: MATCH_SELECT,
      })
    : [];

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

  const byActivity = new Map<string, MemberActivity>();

  function ensure(activity: (typeof registrations)[number]["activity"]): MemberActivity {
    const found = byActivity.get(activity.id);
    if (found) return found;
    const created: MemberActivity = {
      activityId: activity.id,
      title: activity.title,
      isTournament: activity.isTournament,
      isVolunteer: activity.isVolunteer,
      minTeamSize: activity.minTeamSize,
      maxTeamSize: activity.maxTeamSize,
      dates: formatActivityDates(activity),
      registrationStatus: null,
      team: null,
      fixtures: [],
    };
    byActivity.set(activity.id, created);
    return created;
  }

  for (const registration of registrations) {
    ensure(registration.activity).registrationStatus = registration.status;
  }

  for (const membership of teamMemberships) {
    const entry = ensure(membership.team.activity);
    entry.team = {
      id: membership.team.id,
      name: membership.team.name,
      autoNamed: membership.team.autoNamed,
      teammates: membership.team.members
        .filter((m) => m.userId !== membership.userId)
        .map((m) => nameOf(m.user)),
    };
    entry.fixtures = fixtures.filter((f) => f.myTeamId === membership.team.id);
  }

  return NextResponse.json({ rows: buildActivityRows([...byActivity.values()]) });
});
