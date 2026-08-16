import { prisma } from "@/lib/prisma";
import { nameKey } from "@/lib/nameKey";

// "Is this person already a member?" — the question an admin cannot answer
// from a new request, because a second phone number makes a second account and
// nothing on the screen connects the two. Two of the refusals in production
// were exactly this, decided from memory rather than from anything the app
// showed.
//
// The proof fingerprint answers it when the same screenshot is sent twice.
// This answers the rest: the same name, however it was spelled, or the same
// number written on both forms.
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
  matchedOn: "name" | "phone";
};

export async function findSamePerson(memberId: string): Promise<SamePerson[]> {
  const mine = await prisma.member.findUnique({
    where: { id: memberId },
    select: { id: true, fullName: true, phone: true, userId: true },
  });
  if (!mine) return [];

  const key = nameKey(mine.fullName);
  const others = await prisma.member.findMany({
    where: { id: { not: memberId } },
    select: {
      id: true,
      fullName: true,
      phone: true,
      status: true,
      memberNumber: true,
      createdAt: true,
      userId: true,
      user: { select: { phone: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const found: SamePerson[] = [];
  for (const other of others) {
    // Same account is not a second person: one membership per account, and a
    // detached row left behind is the admin's own doing.
    if (mine.userId && other.userId === mine.userId) continue;

    const samePhone = !!mine.phone && mine.phone === other.phone;
    const sameName = key.length > 0 && key === nameKey(other.fullName);
    if (!samePhone && !sameName) continue;

    found.push({
      id: other.id,
      fullName: other.fullName,
      status: other.status,
      memberNumber: other.memberNumber,
      createdAt: other.createdAt,
      accountPhone: other.user?.phone ?? other.phone,
      matchedOn: samePhone ? "phone" : "name",
    });
  }
  return found;
}
