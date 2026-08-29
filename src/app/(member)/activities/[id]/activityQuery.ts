import { prisma } from "@/lib/prisma";

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
      groups: { select: { id: true, name: true }, orderBy: { createdAt: "asc" as const } },
      teams: {
        select: {
          id: true,
          name: true,
          logo: true,
          groupId: true,
          members: {
            select: {
              member: { select: { id: true, user: { select: { fullName: true, photo: true } } } },
            },
            orderBy: { member: { user: { fullName: "asc" } } },
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
          manOfTheMatch: {
            select: { id: true, user: { select: { fullName: true, photo: true } } },
          },
          goals: {
            select: {
              count: true,
              minute: true,
              teamId: true,
              kind: true,
              period: true,
              member: { select: { id: true, user: { select: { fullName: true, photo: true } } } },
            },
          },
          penaltyKicks: {
            orderBy: { order: "asc" as const },
            select: {
              teamId: true,
              order: true,
              scored: true,
              member: { select: { id: true, user: { select: { fullName: true, photo: true } } } },
            },
          },
          bookings: {
            select: {
              cardType: true,
              minute: true,
              teamId: true,
              member: { select: { id: true, user: { select: { fullName: true, photo: true } } } },
            },
          },
          mvpVote: {
            select: {
              id: true,
              status: true,
              candidates: {
                select: {
                  id: true,
                  member: { select: { id: true, user: { select: { fullName: true } } } },
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

type Named = { id: string; user: { fullName: string | null } };
type Pictured = { id: string; user: { fullName: string | null; photo: string | null } };

function person<T extends Pictured>(m: T) {
  return { id: m.id, fullName: m.user.fullName ?? "", photo: m.user.photo };
}

function named<T extends Named>(m: T) {
  return { id: m.id, fullName: m.user.fullName ?? "" };
}

function shape(activity: NonNullable<Awaited<ReturnType<typeof loadActivity>>>) {
  return {
    ...activity,
    teams: activity.teams.map((team) => ({
      ...team,
      members: team.members.map((tm) => ({ member: person(tm.member) })),
    })),
    matches: activity.matches.map((match) => ({
      ...match,
      manOfTheMatch: match.manOfTheMatch ? person(match.manOfTheMatch) : null,
      goals: match.goals.map((goal) => ({
        ...goal,
        member: goal.member ? person(goal.member) : null,
      })),
      penaltyKicks: match.penaltyKicks.map((kick) => ({
        ...kick,
        member: kick.member ? person(kick.member) : null,
      })),
      bookings: match.bookings.map((booking) => ({ ...booking, member: person(booking.member) })),
      mvpVote: match.mvpVote
        ? {
            ...match.mvpVote,
            candidates: match.mvpVote.candidates.map((c) => ({ ...c, member: named(c.member) })),
          }
        : null,
    })),
  };
}

export async function loadActivityPage(id: string) {
  const activity = await loadActivity(id);
  return activity ? shape(activity) : null;
}

export type ActivityPageData = NonNullable<Awaited<ReturnType<typeof loadActivityPage>>>;
