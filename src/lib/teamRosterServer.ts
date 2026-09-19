import { prisma } from "./prisma";
import { ConflictError, NotFoundError, ValidationError } from "./errors";
import { entrantWording, members, tournament } from "./messages";
import { entrantOf } from "./entrantServer";
import { squadOf, teamIsFull } from "./squadSize";
import { currentMembership } from "./currentMembershipServer";
import { clearOtherSeats } from "./teamBuildingServer";
import { releaseCaptain } from "./teamCaptainServer";

export async function addTeamMember(teamId: string, userId: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      activity: { select: { minTeamSize: true, maxTeamSize: true } },
      _count: { select: { members: { where: { status: "ACTIVE" } } } },
    },
  });
  if (!team) throw new NotFoundError(tournament.teamNotFound);

  const squad = squadOf(team.activity);
  const words = entrantWording(entrantOf(team.activity));
  if (teamIsFull(team._count.members, squad)) {
    throw new ConflictError(words.entrantFull(squad.max));
  }

  const membership = await currentMembership(prisma, userId);
  if (!membership) throw new NotFoundError(members.notFound);
  if (membership.status === "REJECTED") throw new ValidationError(tournament.playerRejected);

  const registered = await prisma.activityRegistration.findUnique({
    where: { userId_activityId: { userId, activityId: team.activityId } },
  });
  if (!registered) throw new ValidationError(tournament.playerNotRegistered);

  const seated = await prisma.teamMember.findFirst({
    where: { userId, status: "ACTIVE", team: { activityId: team.activityId } },
    select: { team: { select: { name: true } } },
  });
  if (seated) throw new ConflictError(words.memberAlreadyEntered(seated.team.name));

  const teamMember = await prisma.$transaction(async (tx) => {
    const created = await tx.teamMember.upsert({
      where: { teamId_userId: { teamId, userId } },
      create: { teamId, userId, status: "ACTIVE" },
      update: { status: "ACTIVE" },
      select: { id: true, user: { select: { phone: true, fullName: true, age: true } } },
    });
    await clearOtherSeats(tx, team.activityId, userId, teamId);
    return created;
  });

  return { teamMember, team };
}

const SEAT_SELECT = {
  id: true,
  status: true,
  team: { select: { name: true } },
  user: { select: { fullName: true } },
} as const;

async function seatOf(teamId: string, userId: string) {
  const seat = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
    select: SEAT_SELECT,
  });
  if (!seat) throw new NotFoundError(members.requestNotFound);
  return seat;
}

export async function approveTeamMember(teamId: string, userId: string) {
  const existing = await seatOf(teamId, userId);
  const teamMember = await prisma.teamMember.update({
    where: { id: existing.id },
    data: { status: "ACTIVE" },
  });
  return { teamMember, existing };
}

export async function removeTeamMember(teamId: string, userId: string) {
  const existing = await seatOf(teamId, userId);
  await prisma.$transaction(async (tx) => {
    await releaseCaptain(tx, teamId, userId);
    await tx.teamMember.delete({ where: { id: existing.id } });
  });
  return existing;
}
