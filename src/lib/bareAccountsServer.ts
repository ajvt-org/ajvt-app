import { prisma } from "./prisma";

// Everyone the association holds who has no membership payment on them.
//
// This used to list only accounts with a phone number, which quietly hid the
// people an admin adds by hand without one: they showed up nowhere except
// through their payment, so deleting the payment left a person owning a
// membership number that no screen could reach.
export async function bareAccounts() {
  const users = await prisma.user.findMany({
    where: { members: { none: {} } },
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
