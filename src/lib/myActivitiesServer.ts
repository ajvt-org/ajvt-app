import { prisma } from "./prisma";
import { formatActivityDates } from "./activityDates";
import { buildActivityRows, type MemberActivity } from "./memberActivities";
import { nameOf } from "./person";
import { fixturesForTeams } from "./myFixturesServer";

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

type ActivityRow = {
  id: string;
  title: string;
  isTournament: boolean;
  isVolunteer: boolean;
  minTeamSize: number | null;
  maxTeamSize: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  withTime: boolean;
  period: string | null;
};

export async function myActivities(userId: string) {
  const [registrations, seats] = await Promise.all([
    prisma.activityRegistration.findMany({
      where: { userId },
      select: { status: true, activity: { select: ACTIVITY_SELECT } },
    }),
    prisma.teamMember.findMany({
      where: { status: "ACTIVE", userId },
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
              select: { userId: true, user: { select: { fullName: true } } },
            },
          },
        },
      },
    }),
  ]);

  const fixtures = await fixturesForTeams(seats.map((seat) => seat.team.id));
  const byActivity = new Map<string, MemberActivity>();

  function ensure(activity: ActivityRow): MemberActivity {
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

  for (const seat of seats) {
    const entry = ensure(seat.team.activity);
    entry.team = {
      id: seat.team.id,
      name: seat.team.name,
      autoNamed: seat.team.autoNamed,
      teammates: seat.team.members
        .filter((member) => member.userId !== seat.userId)
        .map((member) => nameOf(member.user)),
    };
    entry.fixtures = fixtures.filter((fixture) => fixture.myTeamId === seat.team.id);
  }

  return buildActivityRows([...byActivity.values()]);
}
