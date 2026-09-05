import { prisma } from "@/lib/prisma";
import { accountNamed, accountPerson } from "@/lib/person";
import { settleMvpVotes } from "@/lib/mvpVoteServer";
import { entrantIdentities, namedEntrant } from "@/lib/entrantName";

export const ACTIVITY_SELECT = {
  photo: true,
  capacity: true,
  isOpen: true,
  isVolunteer: true,
  whatsappLink: true,
  _count: { select: { registrations: { where: { status: { not: "REJECTED" } } } } },
} as const;

async function loadActivity(id: string) {
  return prisma.activity.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      ...ACTIVITY_SELECT,
      description: true,
      period: true,
      startsAt: true,
      endsAt: true,
      withTime: true,
      profile: true,
      teamSize: true,
      isTournament: true,
      showScorersAndCards: true,
      groups: { select: { id: true, name: true }, orderBy: { createdAt: "asc" as const } },
      teams: {
        select: {
          id: true,
          name: true,
          autoNamed: true,
          logo: true,
          groupId: true,
          captainUserId: true,
          members: {
            select: {
              userId: true,
              user: { select: { fullName: true, photo: true } },
            },
            orderBy: { user: { fullName: "asc" } },
          },
        },
      },
      matches: {
        orderBy: [{ status: "asc" }, { order: "asc" }, { matchDate: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          homeTeam: { select: { id: true, name: true, logo: true } },
          awayTeam: { select: { id: true, name: true, logo: true } },
          matchDate: true,
          round: true,
          venue: true,
          isKnockout: true,
          bracketRound: true,
          order: true,
          homeScore: true,
          awayScore: true,
          homePenalties: true,
          awayPenalties: true,
          status: true,
          forfeitWinnerTeamId: true,
          manOfTheMatchUserId: true,
          manOfTheMatchUser: { select: { fullName: true, photo: true } },
          goals: {
            orderBy: { minute: "asc" as const },
            select: {
              count: true,
              minute: true,
              teamId: true,
              kind: true,
              period: true,
              userId: true,
              user: { select: { fullName: true, photo: true } },
            },
          },
          penaltyKicks: {
            orderBy: { order: "asc" as const },
            select: {
              teamId: true,
              order: true,
              scored: true,
              userId: true,
              user: { select: { fullName: true, photo: true } },
            },
          },
          bookings: {
            orderBy: { minute: "asc" as const },
            select: {
              cardType: true,
              minute: true,
              teamId: true,
              userId: true,
              user: { select: { fullName: true, photo: true } },
            },
          },
          mvpVote: {
            select: {
              id: true,
              status: true,
              closesAt: true,
              candidates: {
                select: {
                  id: true,
                  userId: true,
                  user: { select: { fullName: true } },
                  _count: { select: { votes: true } },
                },
              },
            },
          },
        },
      },
    },
  });
}

function shape(activity: NonNullable<Awaited<ReturnType<typeof loadActivity>>>) {
  const teams = activity.teams.map((team) => ({
    ...team,
    members: team.members.map((tm) => ({ member: accountPerson(tm) })),
  }));
  const identities = entrantIdentities(teams, activity.teamSize);

  return {
    ...activity,
    teams: teams.map((team) => ({ ...team, ...identities.get(team.id) })),
    matches: activity.matches.map((match) => ({
      ...match,
      homeTeam: namedEntrant(match.homeTeam, identities),
      awayTeam: namedEntrant(match.awayTeam, identities),
      manOfTheMatch: match.manOfTheMatchUser
        ? accountPerson({ userId: match.manOfTheMatchUserId, user: match.manOfTheMatchUser })
        : null,
      goals: match.goals.map((goal) => ({
        ...goal,
        member: goal.userId ? accountPerson(goal) : null,
      })),
      penaltyKicks: match.penaltyKicks.map((kick) => ({
        ...kick,
        member: kick.userId ? accountPerson(kick) : null,
      })),
      bookings: match.bookings.map((booking) => ({ ...booking, member: accountPerson(booking) })),
      mvpVote: match.mvpVote
        ? {
            ...match.mvpVote,
            candidates: match.mvpVote.candidates.map((c) => ({
              ...c,
              memberId: c.userId,
              member: accountNamed(c),
            })),
          }
        : null,
    })),
  };
}

export async function loadActivityPage(id: string) {
  const activity = await loadActivity(id);
  if (!activity) return null;

  const applied = await settleMvpVotes(activity.matches);
  if (applied.size === 0) return shape(activity);

  const settled = await loadActivity(id);
  return settled ? shape(settled) : null;
}

export type ActivityPageData = NonNullable<Awaited<ReturnType<typeof loadActivityPage>>>;
