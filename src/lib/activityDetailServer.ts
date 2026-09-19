import { prisma } from "./prisma";
import { NotFoundError } from "./errors";
import { activities } from "./messages";
import { nameOf } from "./person";
import { PLAYED_MATCH } from "./activityMatches";

const HISTORY_LIMIT = 30;

export async function activityDetail(id: string) {
  const [activity, rosters, playedMatches] = await Promise.all([
    prisma.activity.findUnique({
      where: { id },
      include: {
        registrations: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            userId: true,
            status: true,
            createdAt: true,
            paymentProof: true,
            rejectionReason: true,
            source: true,
            recordedBy: true,
            user: { select: { phone: true, fullName: true, age: true, photo: true } },
          },
        },
        teams: {
          orderBy: { name: "asc" },
          select: { id: true, name: true, _count: { select: { members: true } } },
        },
        _count: { select: { matches: true, groups: true } },
      },
    }),
    prisma.teamMember.findMany({
      where: { status: "ACTIVE", team: { activityId: id } },
      select: { userId: true, team: { select: { id: true, name: true } } },
    }),
    prisma.match.count({ where: { activityId: id, ...PLAYED_MATCH } }),
  ]);

  if (!activity) throw new NotFoundError(activities.notFound);

  const history = await prisma.auditLog.findMany({
    where: { targetType: "Activity", targetId: id },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
    select: { id: true, action: true, adminUsername: true, createdAt: true },
  });

  const teamOf = new Map(rosters.map((m) => [m.userId, m.team]));

  return {
    activity: {
      ...activity,
      _count: { ...activity._count, playedMatches },
      registrations: activity.registrations.map(({ user, ...registration }) => ({
        ...registration,
        team: teamOf.get(registration.userId) ?? null,
        member: {
          id: registration.userId,
          fullName: nameOf(user),
          age: user.age,
          photo: user.photo,
          phone: user.phone ?? null,
        },
      })),
    },
    history,
  };
}
