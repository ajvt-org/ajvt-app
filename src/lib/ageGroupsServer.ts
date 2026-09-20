import { prisma } from "./prisma";
import { ConflictError, NotFoundError, ValidationError } from "./errors";
import { ageGroups as messages } from "./messages";
import { renameMemberAge } from "./ageGroups";

const NAME_MAX = 30;
const MAX_TOTAL = 10000;

function checkedName(name: unknown): string {
  const value = typeof name === "string" ? name.trim() : "";
  if (!value) throw new ValidationError(messages.nameRequired);
  if (value.length > NAME_MAX) throw new ValidationError(messages.nameTooLong);
  return value;
}

async function groupOrNotFound(id: string) {
  const group = await prisma.ageGroup.findUnique({ where: { id } });
  if (!group) throw new NotFoundError(messages.notFound);
  return group;
}

export async function approvedAgeNames(): Promise<string[]> {
  const groups = await prisma.ageGroup.findMany({
    where: { approved: true },
    orderBy: { createdAt: "asc" },
    select: { name: true },
  });
  return groups.map((group) => group.name);
}

export async function ageGroupRows() {
  const [groups, used] = await Promise.all([
    prisma.ageGroup.findMany({ orderBy: [{ approved: "asc" }, { createdAt: "asc" }] }),
    prisma.user.findMany({ where: { memberships: { some: {} } }, select: { age: true } }),
  ]);

  const counts = new Map<string, number>();
  for (const row of used) {
    if (!row.age) continue;
    counts.set(row.age, (counts.get(row.age) ?? 0) + 1);
  }
  const known = new Set(groups.map((group) => group.name));

  return {
    ageGroups: groups.map((group) => ({ ...group, count: counts.get(group.name) ?? 0 })),
    orphans: [...counts.entries()]
      .filter(([name]) => !known.has(name))
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
  };
}

export async function createAgeGroup(name: unknown) {
  const wanted = checkedName(name);

  const existing = await prisma.ageGroup.findUnique({ where: { name: wanted } });
  if (existing) throw new ConflictError(messages.alreadyExists);

  return prisma.ageGroup.create({ data: { name: wanted, approved: true } });
}

export async function approveAgeGroup(id: string) {
  await groupOrNotFound(id);
  return prisma.ageGroup.update({ where: { id }, data: { approved: true } });
}

export async function renameAgeGroup(id: string, name: unknown) {
  const wanted = checkedName(name);

  const existing = await groupOrNotFound(id);
  const clash = await prisma.ageGroup.findUnique({ where: { name: wanted } });
  if (clash && clash.id !== id) throw new ConflictError(messages.alreadyExists);

  const [ageGroup, moved] = await prisma.$transaction([
    prisma.ageGroup.update({ where: { id }, data: { name: wanted } }),
    renameMemberAge(existing.name, wanted),
  ]);

  return { ageGroup, existing, moved };
}

export async function removeAgeGroup(id: string) {
  const existing = await groupOrNotFound(id);
  await prisma.ageGroup.delete({ where: { id } });
  return existing;
}

export async function setAgeGroupTotal(id: string, totalCount: unknown) {
  if (
    !Number.isInteger(totalCount) ||
    (totalCount as number) < 0 ||
    (totalCount as number) > MAX_TOTAL
  ) {
    throw new ValidationError(messages.totalInvalid);
  }

  const existing = await groupOrNotFound(id);
  const ageGroup = await prisma.ageGroup.update({
    where: { id },
    data: { totalCount: totalCount as number },
  });

  return { ageGroup, existing };
}

export async function reassignAgeGroup(from: unknown, to: unknown) {
  const leaving = typeof from === "string" ? from.trim() : "";
  const joining = typeof to === "string" ? to.trim() : "";

  if (!leaving || !joining) throw new ValidationError(messages.bothGroupsRequired);
  if (leaving === joining) throw new ValidationError(messages.sameGroup);

  const target = await prisma.ageGroup.findUnique({ where: { name: joining } });
  if (!target) throw new NotFoundError(messages.targetNotFound);

  const moved = await renameMemberAge(leaving, target.name);
  if (moved === 0) throw new NotFoundError(messages.noMembersInGroup);

  return { from: leaving, target, moved };
}
