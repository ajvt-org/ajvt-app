import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";
import { ConflictError, NotFoundError } from "./errors";
import { members as messages } from "./messages";
import { currentMembership } from "./currentMembershipServer";
import { endingRefusal, restoreRefusal } from "./membershipEnding";
import { endingRefusalMessage, restoreRefusalMessage } from "./membershipEndingMessages";
import { PERSON_SELECT } from "./person";

type Db = PrismaClient | Prisma.TransactionClient;

export interface Ending {
  reason: string;
  by: string;
  at: Date;
}

export async function endMembership(db: Db, userId: string, year: number, ending: Ending) {
  await db.membership.updateMany({
    where: { userId, year },
    data: { endedAt: ending.at, endedReason: ending.reason, endedBy: ending.by },
  });
}

export async function restoreMembership(db: Db, userId: string, year: number) {
  await db.membership.updateMany({
    where: { userId, year },
    data: { endedAt: null, endedReason: null, endedBy: null },
  });
}

async function personAndMembership(userId: string) {
  const person = await prisma.user.findUnique({ where: { id: userId }, select: PERSON_SELECT });
  if (!person) throw new NotFoundError(messages.notFound);

  const membership = await currentMembership(prisma, userId);
  if (!membership) throw new NotFoundError(messages.notFound);

  return { person, membership };
}

export async function endMembershipByAdmin(userId: string, ending: Ending) {
  const { person, membership } = await personAndMembership(userId);
  const refusal = endingRefusal(membership);
  if (refusal) throw new ConflictError(endingRefusalMessage(refusal));

  await endMembership(prisma, userId, membership.year, ending);

  return { person, year: membership.year };
}

export async function restoreMembershipByAdmin(userId: string) {
  const { person, membership } = await personAndMembership(userId);
  const refusal = restoreRefusal(membership);
  if (refusal) throw new ConflictError(restoreRefusalMessage(refusal));

  await restoreMembership(prisma, userId, membership.year);

  return { person, membership };
}
