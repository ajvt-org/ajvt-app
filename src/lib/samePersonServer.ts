import { prisma } from "@/lib/prisma";
import { nameKey } from "@/lib/nameKey";
import { nameOf } from "./person";

export type SamePerson = {
  id: string;
  fullName: string;
  status: string;
  memberNumber: string | null;
  createdAt: Date;
  accountPhone: string | null;
};

export async function findSamePerson(memberId: string): Promise<SamePerson[]> {
  const mine = await prisma.member.findUnique({
    where: { id: memberId },
    select: { id: true, userId: true, user: { select: { fullName: true } } },
  });
  if (!mine) return [];

  const key = nameKey(nameOf(mine.user));
  const others = await prisma.member.findMany({
    where: { id: { not: memberId } },
    select: {
      id: true,
      status: true,
      createdAt: true,
      userId: true,
      user: { select: { fullName: true, memberNumber: true, phone: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const found: SamePerson[] = [];
  for (const other of others) {
    if (mine.userId && other.userId === mine.userId) continue;

    if (key.length === 0 || key !== nameKey(nameOf(other.user))) continue;

    found.push({
      id: other.id,
      fullName: nameOf(other.user),
      status: other.status,
      memberNumber: other.user.memberNumber,
      createdAt: other.createdAt,
      accountPhone: other.user.phone ?? null,
    });
  }
  return found;
}
