import { prisma } from "./prisma";
import { nameOf } from "./person";
import { squadOf } from "./squadSize";
import { isInvitation, isMember, isRequest, type SeatKind } from "./teamInvites";
import type { BuildableTournament } from "./teamBuildingServer";

const ROSTER = {
  userId: true,
  status: true,
  invitedByCaptain: true,
  user: { select: { fullName: true, photo: true } },
} as const;

const SEAT = {
  status: true,
  invitedByCaptain: true,
  team: { select: { id: true, name: true } },
} as const;

export interface MyTeamMember {
  userId: string;
  fullName: string;
  photo: string | null;
  kind: SeatKind;
}

export interface TeamHandle {
  id: string;
  name: string;
}

export interface Candidate {
  userId: string;
  fullName: string;
}

export interface MyTeamView {
  team: (TeamHandle & { captainUserId: string | null; members: MyTeamMember[] }) | null;
  request: TeamHandle | null;
  invitations: TeamHandle[];
  candidates: Candidate[];
  squad: { min: number | null; max: number | null };
}

async function candidatesFor(activityId: string): Promise<Candidate[]> {
  const free = await prisma.activityRegistration.findMany({
    where: {
      activityId,
      status: "ACTIVE",
      user: { teamMemberships: { none: { team: { activityId } } } },
    },
    select: { user: { select: { id: true, fullName: true } } },
    orderBy: { user: { fullName: "asc" } },
  });
  return free
    .filter((row) => row.user.id !== null)
    .map((row) => ({ userId: row.user.id, fullName: nameOf(row.user) }));
}

export async function myTeamView(
  activity: BuildableTournament,
  userId: string,
): Promise<MyTeamView> {
  const seats = await prisma.teamMember.findMany({
    where: { userId, team: { activityId: activity.id } },
    select: SEAT,
    orderBy: { createdAt: "asc" },
  });

  const seated = seats.find(isMember) ?? null;
  const asked = seats.find(isRequest) ?? null;

  const team = seated
    ? await prisma.team.findUnique({
        where: { id: seated.team.id },
        select: {
          id: true,
          name: true,
          captainUserId: true,
          members: { select: ROSTER, orderBy: { createdAt: "asc" } },
        },
      })
    : null;

  const captain = team !== null && team.captainUserId === userId;

  return {
    squad: squadOf(activity),
    request: asked ? asked.team : null,
    invitations: seats.filter(isInvitation).map((seat) => seat.team),
    candidates: captain ? await candidatesFor(activity.id) : [],
    team: team
      ? {
          id: team.id,
          name: team.name,
          captainUserId: team.captainUserId,
          members: team.members.map((m) => ({
            userId: m.userId,
            fullName: nameOf(m.user),
            photo: m.user.photo,
            kind: isMember(m) ? "member" : isInvitation(m) ? "invitation" : "request",
          })),
        }
      : null,
  };
}
