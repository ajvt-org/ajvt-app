import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { members } from "@/lib/messages";
import { confirmationMatches } from "@/lib/deletedRecords";
import { archive, purgeExpired } from "@/lib/deletedRecordsServer";
import { forgetQuizFootprint } from "@/lib/quizAttemptServer";
import { nameOf } from "@/lib/person";

export async function deleteMember(id: string, confirmName: string, by: string) {
  const account = await prisma.user.findUnique({
    where: { id },
    select: { fullName: true, age: true, memberships: { select: { id: true }, take: 1 } },
  });
  if (!account || account.memberships.length === 0) {
    throw new NotFoundError(members.requestNotFound);
  }

  const { memberships: _held, ...person } = account;
  void _held;
  if (!confirmationMatches(confirmName, nameOf(person))) {
    throw new ValidationError(members.confirmByName);
  }

  const years = await prisma.membership.findMany({ where: { userId: id } });
  await archive(
    "Member",
    id,
    nameOf(person),
    { userId: id, memberships: years } as unknown as Prisma.InputJsonValue,
    by,
  );
  await prisma.membership.deleteMany({ where: { userId: id } });
  const forgotten = await forgetQuizFootprint(id);
  await purgeExpired();

  return { person, forgotten };
}
