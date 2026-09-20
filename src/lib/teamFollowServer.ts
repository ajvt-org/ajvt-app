import { prisma } from "./prisma";
import { NotFoundError } from "./errors";
import { tournament } from "./messages";

export async function isFollowing(userId: string, teamId: string): Promise<boolean> {
  const follow = await prisma.teamFollow.findUnique({
    where: { userId_teamId: { userId, teamId } },
  });
  return !!follow;
}

export async function followTeam(userId: string, teamId: string): Promise<void> {
  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { id: true } });
  if (!team) throw new NotFoundError(tournament.teamNotFound);

  await prisma.teamFollow.upsert({
    where: { userId_teamId: { userId, teamId } },
    update: {},
    create: { userId, teamId },
  });
}

export async function unfollowTeam(userId: string, teamId: string): Promise<void> {
  await prisma.teamFollow.deleteMany({ where: { userId, teamId } });
}
