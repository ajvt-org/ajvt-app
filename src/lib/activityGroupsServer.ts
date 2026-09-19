import { prisma } from "./prisma";
import { ConflictError, ValidationError } from "./errors";
import { activities, entrantWording, tournament } from "./messages";
import { entrantOfActivity } from "./entrantServer";
import { trimmed } from "./activityFields";

const NAME_MAX = 40;
const CAPACITY_MIN = 2;
const CAPACITY_MAX = 64;

export interface NewGroup {
  name?: unknown;
  capacity?: unknown;
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

async function groupCapacity(id: string, capacity: unknown): Promise<number | null> {
  if (capacity === undefined || capacity === null || capacity === "") return null;
  const value = Number(capacity);
  if (!Number.isInteger(value) || value < CAPACITY_MIN || value > CAPACITY_MAX) {
    throw new ValidationError(
      entrantWording(await entrantOfActivity(prisma, id)).targetEntrantsRange,
    );
  }
  return value;
}

export async function createActivityGroup(id: string, input: NewGroup) {
  const name = trimmed(input.name);
  if (!name) throw new ValidationError(tournament.groupNameRequired);
  if (name.length > NAME_MAX) throw new ValidationError(tournament.groupNameTooLong);

  const capacity = await groupCapacity(id, input.capacity);

  const activity = await prisma.activity.findUnique({
    where: { id },
    select: { isTournament: true, format: true },
  });
  if (!activity?.isTournament) throw new ValidationError(activities.notATournament);
  if (activity.format === "KNOCKOUT") throw new ConflictError(tournament.groupsNotInKnockout);

  return prisma.group.create({ data: { activityId: id, name, capacity } });
}
