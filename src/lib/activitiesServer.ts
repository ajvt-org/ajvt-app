import { prisma } from "./prisma";
import { NotFoundError } from "./errors";
import { activities } from "./messages";
import { nameOf } from "./person";
import { STANDING_MATCH_SELECT, matchStanding } from "./activityMatches";
import { LEVELS_SELECT } from "./matchSeriesServer";

const REGISTRATION_SELECT = {
  id: true,
  status: true,
  paymentProof: true,
  rejectionReason: true,
  createdAt: true,
  userId: true,
  user: { select: { phone: true, fullName: true, age: true } },
} as const;

export async function activityRows(scoped: string[] | null) {
  const rows = await prisma.activity.findMany({
    where: scoped ? { id: { in: scoped } } : {},
    orderBy: { order: "asc" },
    include: {
      registrations: { select: REGISTRATION_SELECT, orderBy: { createdAt: "asc" } },
      teams: {
        select: {
          _count: {
            select: { members: { where: { status: "PENDING", invitedByCaptain: false } } },
          },
        },
      },
      matches: { select: STANDING_MATCH_SELECT },
    },
  });

  return rows.map(({ teams, matches, registrations, ...activity }) => ({
    ...activity,
    ...matchStanding(matches, activity.isTournament),
    registrations: registrations.map(({ user, userId, ...registration }) => ({
      ...registration,
      member: {
        id: userId,
        fullName: nameOf(user),
        phone: user.phone,
        age: user.age ?? "",
      },
    })),
    pendingJoinRequests: teams.reduce((sum, team) => sum + team._count.members, 0),
  }));
}

export async function activitySettings(id: string) {
  const activity = await prisma.activity.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      photo: true,
      isTournament: true,
      format: true,
      matchShape: true,
      levels: LEVELS_SELECT,
      hasColours: true,
      firstColourWord: true,
      secondColourWord: true,
      minTeamSize: true,
      maxTeamSize: true,
      organisedByHomeVillage: true,
      playersBuildTeams: true,
      outsidePlayerLimit: true,
      startsAt: true,
      endsAt: true,
    },
  });
  if (!activity) throw new NotFoundError(activities.notFound);
  return activity;
}
