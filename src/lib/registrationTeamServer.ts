import type { Prisma } from "@prisma/client";
import { nameOf } from "./person";
import { isSinglesActivity, type EntrantActivity } from "./entrant";

type Tx = Prisma.TransactionClient;

const REGISTRATION_SEAT = {
  userId: true,
  status: true,
  activityId: true,
  chosenTeamId: true,
  user: { select: { fullName: true } },
  activity: { select: { isTournament: true, minTeamSize: true, maxTeamSize: true } },
} satisfies Prisma.ActivityRegistrationSelect;

export function joinableTeams<T>(activity: EntrantActivity, teams: T[]): T[] {
  return activity.isTournament && !isSinglesActivity(activity) ? teams : [];
}

async function seatOfViewer(tx: Tx, activityId: string, userId: string) {
  return tx.teamMember.findFirst({
    where: { userId, team: { activityId } },
    select: { id: true, teamId: true },
  });
}

export async function seatRegistrant(tx: Tx, registrationId: string): Promise<string | null> {
  const registration = await tx.activityRegistration.findUnique({
    where: { id: registrationId },
    select: REGISTRATION_SEAT,
  });
  if (!registration || registration.status !== "ACTIVE") return null;

  const already = await seatOfViewer(tx, registration.activityId, registration.userId);
  if (already) return already.teamId;

  if (isSinglesActivity(registration.activity)) {
    const team = await tx.team.create({
      data: {
        activityId: registration.activityId,
        name: nameOf(registration.user),
        autoNamed: true,
      },
    });
    await tx.teamMember.create({
      data: { teamId: team.id, userId: registration.userId, status: "ACTIVE" },
    });
    return team.id;
  }

  if (registration.chosenTeamId === null) return null;
  const team = await tx.team.findUnique({
    where: { id: registration.chosenTeamId },
    select: { id: true, activityId: true },
  });
  if (!team || team.activityId !== registration.activityId) return null;

  await tx.teamMember.create({
    data: { teamId: team.id, userId: registration.userId, status: "ACTIVE" },
  });
  return team.id;
}

export async function unseatRegistrant(
  tx: Tx,
  activityId: string,
  userId: string,
): Promise<boolean> {
  const activity = await tx.activity.findUnique({
    where: { id: activityId },
    select: { isTournament: true, minTeamSize: true, maxTeamSize: true },
  });
  if (!activity || !isSinglesActivity(activity)) return false;

  const seat = await seatOfViewer(tx, activityId, userId);
  if (!seat) return false;

  const team = await tx.team.findUnique({
    where: { id: seat.teamId },
    select: {
      autoNamed: true,
      _count: { select: { members: true, homeMatches: true, awayMatches: true } },
    },
  });
  if (!team || !team.autoNamed || team._count.members > 1) return false;
  if (team._count.homeMatches > 0 || team._count.awayMatches > 0) return false;

  await tx.team.delete({ where: { id: seat.teamId } });
  return true;
}
