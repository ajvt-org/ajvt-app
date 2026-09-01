import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export async function joinChosenTeam(tx: Tx, registrationId: string): Promise<string | null> {
  const registration = await tx.activityRegistration.findUnique({
    where: { id: registrationId },
    select: { userId: true, status: true, activityId: true, chosenTeamId: true },
  });
  if (!registration || registration.status !== "ACTIVE" || registration.chosenTeamId === null) {
    return null;
  }

  const team = await tx.team.findUnique({
    where: { id: registration.chosenTeamId },
    select: { id: true, activityId: true },
  });
  if (!team || team.activityId !== registration.activityId) return null;

  const already = await tx.teamMember.findFirst({
    where: { userId: registration.userId, team: { activityId: registration.activityId } },
    select: { id: true, teamId: true },
  });
  if (already) return already.teamId;

  await tx.teamMember.create({
    data: { teamId: team.id, userId: registration.userId, status: "ACTIVE" },
  });
  return team.id;
}
