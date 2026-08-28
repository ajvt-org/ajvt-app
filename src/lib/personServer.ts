import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export async function syncPersonFromMember(db: Db, memberId: string) {
  const member = await db.member.findUnique({
    where: { id: memberId },
    select: {
      userId: true,
      fullName: true,
      age: true,
      village: true,
      photo: true,
      memberNumber: true,
      verifyToken: true,
    },
  });
  if (!member) return;

  const { userId, ...person } = member;
  await db.user.update({ where: { id: userId }, data: person });
}
