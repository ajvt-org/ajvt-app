import { prisma } from "./prisma";
import { ConflictError, NotFoundError, ValidationError } from "./errors";
import { villages as messages } from "./messages";
import { OTHER_VILLAGE, VILLAGE_NAME_MAX, isReservedVillageName } from "./villages";
import { renameMemberVillage } from "./villagesServer";

function checkedName(name: unknown): string {
  const value = String(name ?? "").trim();
  if (!value) throw new ValidationError(messages.nameRequired);
  if (value.length > VILLAGE_NAME_MAX) throw new ValidationError(messages.nameTooLong);
  if (isReservedVillageName(value)) throw new ValidationError(messages.reservedName);
  return value;
}

async function villageOrNotFound(id: string) {
  const village = await prisma.village.findUnique({ where: { id } });
  if (!village) throw new NotFoundError(messages.notFound);
  return village;
}

export async function villageRows() {
  const [rows, used] = await Promise.all([
    prisma.village.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.user.findMany({ where: { memberships: { some: {} } }, select: { village: true } }),
  ]);

  const counts = new Map<string, number>();
  for (const row of used) {
    counts.set(row.village, (counts.get(row.village) ?? 0) + 1);
  }
  const known = new Set(rows.map((row) => row.name));

  return {
    villages: rows.map((row) => ({ ...row, count: counts.get(row.name) ?? 0 })),
    otherCount: counts.get(OTHER_VILLAGE) ?? 0,
    unlisted: [...counts.entries()]
      .filter(([name]) => name !== OTHER_VILLAGE && !known.has(name))
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
  };
}

export async function createVillage(name: unknown) {
  const wanted = checkedName(name);

  const existing = await prisma.village.findUnique({ where: { name: wanted } });
  if (existing) throw new ConflictError(messages.alreadyExists);

  return prisma.village.create({ data: { name: wanted } });
}

export async function renameVillage(id: string, name: unknown) {
  const wanted = checkedName(name);

  const existing = await villageOrNotFound(id);
  const clash = await prisma.village.findUnique({ where: { name: wanted } });
  if (clash && clash.id !== id) throw new ConflictError(messages.alreadyExists);

  const [village, moved] = await prisma.$transaction([
    prisma.village.update({ where: { id }, data: { name: wanted } }),
    renameMemberVillage(existing.name, wanted),
  ]);

  return { village, existing, moved };
}

export async function removeVillage(id: string) {
  const existing = await villageOrNotFound(id);
  await prisma.village.delete({ where: { id } });
  return existing;
}
