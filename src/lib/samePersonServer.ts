import { prisma } from "@/lib/prisma";
import { nameKey } from "@/lib/nameKey";
import { nameOf } from "./person";
import { latestMembership } from "./currentMembership";

export type SamePerson = {
  id: string;
  fullName: string;
  status: string;
  memberNumber: string | null;
  createdAt: Date;
  accountPhone: string | null;
};

export async function findSamePerson(userId: string): Promise<SamePerson[]> {
  const mine = await prisma.user.findUnique({
    where: { id: userId },
    select: { fullName: true },
  });
  if (!mine) return [];

  const key = nameKey(nameOf(mine));
  const others = await prisma.user.findMany({
    where: { id: { not: userId }, memberships: { some: {} } },
    select: {
      id: true,
      fullName: true,
      memberNumber: true,
      phone: true,
      createdAt: true,
      memberships: { select: { year: true, status: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const found: SamePerson[] = [];
  for (const other of others) {
    if (key.length === 0 || key !== nameKey(nameOf(other))) continue;

    found.push({
      id: other.id,
      fullName: nameOf(other),
      status: latestMembership(other.memberships)?.status ?? "PENDING",
      memberNumber: other.memberNumber,
      createdAt: other.createdAt,
      accountPhone: other.phone ?? null,
    });
  }
  return found;
}
