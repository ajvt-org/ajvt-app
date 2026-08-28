import { prisma } from "./prisma";

export async function bareAccounts() {
  const users = await prisma.user.findMany({
    where: { members: { none: {} }, phone: { not: null } },
    select: {
      id: true,
      phone: true,
      createdAt: true,
      lastActiveDate: true,
      _count: { select: { pushSubscriptions: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return users.map(({ _count, ...user }) => ({
    ...user,
    phone: user.phone ?? "",
    hasPush: _count.pushSubscriptions > 0,
  }));
}
