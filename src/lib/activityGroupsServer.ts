import { prisma } from "./prisma";
import { ConflictError, NotFoundError, ValidationError } from "./errors";
import { activities, entrantWording, tournament, type EntrantWording } from "./messages";
import { entrantOfActivity, entrantOfGroup } from "./entrantServer";
import { trimmed } from "./activityFields";

const NAME_MAX = 40;
const CAPACITY_MIN = 2;
const CAPACITY_MAX = 64;

export interface NewGroup {
  name?: unknown;
  capacity?: unknown;
}

function checkedName(name: unknown): string {
  const value = trimmed(name);
  if (!value) throw new ValidationError(tournament.groupNameRequired);
  if (value.length > NAME_MAX) throw new ValidationError(tournament.groupNameTooLong);
  return value;
}

async function checkedCapacity(
  capacity: unknown,
  wording: () => Promise<EntrantWording>,
): Promise<number | null> {
  if (capacity === undefined || capacity === null || capacity === "") return null;
  const value = Number(capacity);
  if (!Number.isInteger(value) || value < CAPACITY_MIN || value > CAPACITY_MAX) {
    throw new ValidationError((await wording()).targetEntrantsRange);
  }
  return value;
}

export async function listActivityGroups(id: string) {
  const [groups, activity] = await Promise.all([
    prisma.group.findMany({ where: { activityId: id }, orderBy: { createdAt: "asc" } }),
    prisma.activity.findUnique({
      where: { id },
      select: { format: true, minTeamSize: true, maxTeamSize: true },
    }),
  ]);

  return {
    groups,
    format: activity?.format ?? null,
    minTeamSize: activity?.minTeamSize ?? null,
    maxTeamSize: activity?.maxTeamSize ?? null,
  };
}

export async function createActivityGroup(id: string, input: NewGroup) {
  const name = checkedName(input.name);

  const capacity = await checkedCapacity(input.capacity, async () =>
    entrantWording(await entrantOfActivity(prisma, id)),
  );

  const activity = await prisma.activity.findUnique({
    where: { id },
    select: { isTournament: true, format: true },
  });
  if (!activity?.isTournament) throw new ValidationError(activities.notATournament);
  if (activity.format === "KNOCKOUT") throw new ConflictError(tournament.groupsNotInKnockout);

  return prisma.group.create({ data: { activityId: id, name, capacity } });
}

export async function updateGroup(groupId: string, input: NewGroup) {
  const data: { name: string; capacity?: number | null } = { name: checkedName(input.name) };

  if (input.capacity !== undefined) {
    data.capacity = await checkedCapacity(input.capacity, async () =>
      entrantWording(await entrantOfGroup(prisma, groupId)),
    );
  }

  const before = await prisma.group.findUnique({
    where: { id: groupId },
    select: { name: true, capacity: true },
  });
  const group = await prisma.group.update({ where: { id: groupId }, data });

  return { group, before };
}

export async function removeGroup(groupId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { name: true, activityId: true },
  });
  if (!group) throw new NotFoundError(tournament.groupNotFound);

  const fixtures = await prisma.match.count({ where: { activityId: group.activityId } });
  if (fixtures > 0) throw new ConflictError(tournament.groupHasMatches);

  await prisma.group.delete({ where: { id: groupId } });
  return group;
}
