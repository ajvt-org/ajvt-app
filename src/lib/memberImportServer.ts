import { prisma } from "./prisma";
import type { ExistingPerson } from "./memberImportCheck";

export async function importContext(): Promise<{
  people: ExistingPerson[];
  ageGroupNames: string[];
}> {
  const [accounts, groups] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        phone: true,
        village: true,
        age: true,
        memberships: { select: { id: true }, take: 1 },
      },
    }),
    prisma.ageGroup.findMany({ orderBy: { createdAt: "asc" }, select: { name: true } }),
  ]);

  return {
    people: accounts.map((account) => ({
      id: account.id,
      fullName: account.fullName,
      phone: account.phone,
      village: account.village,
      age: account.age,
      hasMembership: account.memberships.length > 0,
    })),
    ageGroupNames: groups.map((group) => group.name),
  };
}
