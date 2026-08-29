import { prisma } from "@/lib/prisma";

export const ACTIVITY_SELECT = {
  photo: true,
  capacity: true,
  isOpen: true,
  isVolunteer: true,
  whatsappLink: true,
  _count: { select: { registrations: { where: { status: { not: "REJECTED" } } } } },
} as const;

export async function loadActivityPage(id: string) {
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
            select: { member: { select: { id: true, fullName: true, photo: true } } },
            orderBy: { member: { fullName: "asc" } },
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
          manOfTheMatch: { select: { id: true, fullName: true, photo: true } },
          goals: {
            orderBy: { minute: "asc" as const },
            select: {
              count: true,
              minute: true,
              teamId: true,
              kind: true,
              period: true,
              member: { select: { id: true, fullName: true, photo: true } },
            },
          },
          penaltyKicks: {
            orderBy: { order: "asc" as const },
            select: {
              teamId: true,
              order: true,
              scored: true,
              member: { select: { id: true, fullName: true, photo: true } },
            },
          },
          bookings: {
            orderBy: { minute: "asc" as const },
            select: {
              cardType: true,
              minute: true,
              teamId: true,
              member: { select: { id: true, fullName: true, photo: true } },
            },
          },
          mvpVote: {
            select: {
              id: true,
              status: true,
              candidates: {
                select: {
                  id: true,
                  member: { select: { id: true, fullName: true } },
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

export type ActivityPageData = NonNullable<Awaited<ReturnType<typeof loadActivityPage>>>;
