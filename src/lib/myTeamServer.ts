import { prisma } from "./prisma";
import { nameOf } from "./person";
import { squadOf } from "./squadSize";
import type { BuildableTournament } from "./teamBuildingServer";

const ROSTER = {
  userId: true,
  status: true,
  invitedByCaptain: true,
  user: { select: { fullName: true, photo: true } },
} as const;

export interface MyTeamMember {
  userId: string;
  fullName: string;
  photo: string | null;
  status: "PENDING" | "ACTIVE";
  invitedByCaptain: boolean;
}

export interface MyTeamView {
  team: {
    id: string;
    name: string;
    captainUserId: string | null;
    members: MyTeamMember[];
  } | null;
  squad: { min: number | null; max: number | null };
}

export async function myTeamView(
  activity: BuildableTournament,
  userId: string,
  teamId?: string,
): Promise<MyTeamView> {
  const seat = teamId
    ? { teamId }
    : await prisma.teamMember.findFirst({
        where: { userId, team: { activityId: activity.id } },
        select: { teamId: true },
      });

  const team = seat
    ? await prisma.team.findUnique({
        where: { id: seat.teamId },
        select: {
          id: true,
          name: true,
          captainUserId: true,
          members: { select: ROSTER, orderBy: { createdAt: "asc" } },
        },
      })
    : null;

  return {
    squad: squadOf(activity),
    team: team
      ? {
          id: team.id,
          name: team.name,
          captainUserId: team.captainUserId,
          members: team.members.map((m) => ({
            userId: m.userId,
            fullName: nameOf(m.user),
            photo: m.user.photo,
            status: m.status,
            invitedByCaptain: m.invitedByCaptain,
          })),
        }
      : null,
  };
}
