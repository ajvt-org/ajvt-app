import { prisma } from "./prisma";
import { nameOf } from "./person";

export async function activityRoster(id: string) {
  const registrations = await prisma.activityRegistration.findMany({
    where: {
      activityId: id,
      status: "ACTIVE",
      user: { memberships: { some: { status: { not: "REJECTED" } } } },
    },
    select: {
      user: {
        select: {
          id: true,
          phone: true,
          fullName: true,
          age: true,
          photo: true,
          teamMemberships: {
            where: { status: "ACTIVE", team: { activityId: id } },
            select: { team: { select: { id: true, name: true } } },
          },
        },
      },
    },
    orderBy: { user: { fullName: "asc" } },
  });

  return registrations
    .map(({ user }) => ({
      id: user.id,
      fullName: nameOf(user),
      phone: user.phone ?? null,
      age: user.age,
      photo: user.photo,
      team: user.teamMemberships[0]?.team || null,
    }))
    .filter((entry): entry is typeof entry & { id: string } => entry.id !== null);
}
