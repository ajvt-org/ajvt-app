import { prisma } from "@/lib/prisma";
import { nameKey } from "@/lib/nameKey";
import { nameOf } from "./person";

// "Is this person already a member?" — the question an admin cannot answer
// from a new request, because a second phone number makes a second account and
// nothing on the screen connects the two. Two of the refusals in production
// were exactly this, decided from memory rather than from anything the app
// showed.
//
// The proof fingerprint answers it when the same screenshot is sent twice.
// This answers the rest: the same name, however it was spelled. A number
// cannot help — an account is its number, so two accounts never share one.
//
// The scan is over every member because the key is computed, not stored. At
// this size that is one small query; if the roll ever grows enough to feel it,
// the key becomes a column.
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
    // Same account is not a second person: one membership per account, and a
    // detached row left behind is the admin's own doing.
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
