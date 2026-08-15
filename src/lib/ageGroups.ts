import { prisma } from "./prisma";

// Raw SQL on purpose. Member.updatedAt is @updatedAt, so renaming through the
// client stamps every row it touches, and the member's own page reads that
// field as the date their request was decided. Renaming a عصر would move
// everyone's approval date to the moment an admin fixed a spelling.
export function renameMemberAge(from: string, to: string) {
  return prisma.$executeRaw`UPDATE "Member" SET "age" = ${to} WHERE "age" = ${from}`;
}
