import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { NotFoundError, ValidationError } from "./errors";
import { accounts } from "./messages";
import { confirmationMatches } from "./deletedRecords";
import { archive, purgeExpired } from "./deletedRecordsServer";
import { forgetQuizFootprint } from "./quizAttemptServer";
import { withdrawReceiptsBeforeDelete } from "./paymentReceiptServer";

function identifiers(user: { fullName: string | null; phone: string | null }): string[] {
  return [user.fullName, user.phone].map((value) => value?.trim() ?? "").filter(Boolean);
}

export async function personOrNotFound(id: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError(accounts.notFound);
  return user;
}

export async function deletePerson(
  user: { id: string; fullName: string | null; phone: string | null },
  typed: string,
  by: string,
) {
  const expected = identifiers(user);
  if (!expected.length || !expected.some((value) => confirmationMatches(typed, value))) {
    throw new ValidationError(accounts.confirmPerson);
  }

  const id = user.id;
  const years = await prisma.membership.findMany({ where: { userId: id } });
  const payments = await prisma.payment.findMany({
    where: { userId: id },
    orderBy: { createdAt: "asc" },
  });
  const label = user.fullName?.trim() || user.phone || id;

  if (years.length > 0) {
    await archive(
      "Member",
      id,
      label,
      { userId: id, memberships: years } as unknown as Prisma.InputJsonValue,
      by,
    );
  }
  await archive("User", id, label, { ...user, payments } as unknown as Prisma.InputJsonValue, by);

  const forgotten = await forgetQuizFootprint(id);
  await prisma.$transaction(async (tx) => {
    await withdrawReceiptsBeforeDelete(tx, { userId: id });
    await tx.user.delete({ where: { id } });
  });
  await purgeExpired();

  return { label, years: years.length, payments: payments.length, forgotten };
}
