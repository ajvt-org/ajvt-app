import { prisma } from "./prisma";

export async function bareAccounts() {
  const users = await prisma.user.findMany({
    where: { memberships: { none: {} } },
    select: {
      id: true,
      phone: true,
      fullName: true,
      createdAt: true,
      lastActiveDate: true,
      _count: { select: { pushSubscriptions: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return users.map(({ _count, ...user }) => ({
    ...user,
    hasPush: _count.pushSubscriptions > 0,
  }));
}
