import { prisma } from "./prisma";
import { NotFoundError, ValidationError } from "./errors";
import { activities } from "./messages";
import { normalizePlayerCount } from "./squadSize";
import { volunteerProblem, type NewActivity } from "./activityFields";

async function nextOrder(): Promise<number> {
  const { _max } = await prisma.activity.aggregate({ _max: { order: true } });
  return (_max.order ?? -1) + 1;
}

export async function createActivity(input: NewActivity) {
  const isTournament = !!input.isTournament;
  const isVolunteer = !!input.isVolunteer;

  const problem = volunteerProblem({
    isTournament,
    isVolunteer,
    whatsappLink: input.whatsappLink ?? null,
  });
  if (problem) throw new ValidationError(problem);

  return prisma.activity.create({
    data: {
      title: input.title,
      description: input.description,
      period: input.period?.trim() || null,
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
      withTime: !!input.withTime,
      photo: input.photo || null,
      capacity: input.capacity ?? null,
      isTournament,
      format: isTournament ? (input.format ?? "KNOCKOUT") : null,
      matchShape: input.matchShape ?? "FOOTBALL",
      minTeamSize: isTournament ? normalizePlayerCount(input.minTeamSize) : null,
      maxTeamSize: isTournament ? normalizePlayerCount(input.maxTeamSize) : null,
      organisedByHomeVillage: isTournament && !!input.organisedByHomeVillage,
      playersBuildTeams: isTournament && !!input.playersBuildTeams,
      outsidePlayerLimit: isTournament ? normalizePlayerCount(input.outsidePlayerLimit) : null,
      isVolunteer,
      whatsappLink: isVolunteer ? input.whatsappLink!.trim() : null,
      published: false,
      order: await nextOrder(),
    },
  });
}

export async function duplicateActivity(id: string) {
  const source = await prisma.activity.findUnique({ where: { id } });
  if (!source) throw new NotFoundError(activities.notFound);

  const activity = await prisma.activity.create({
    data: {
      title: activities.copyOf(source.title),
      description: source.description,
      period: source.period,
      startsAt: source.startsAt,
      endsAt: source.endsAt,
      withTime: source.withTime,
      photo: source.photo,
      capacity: source.capacity,
      isOpen: source.isOpen,
      autoApprove: source.autoApprove,
      isTournament: source.isTournament,
      showScorersAndCards: source.showScorersAndCards,
      format: source.format,
      matchShape: source.matchShape,
      minTeamSize: source.minTeamSize,
      maxTeamSize: source.maxTeamSize,
      organisedByHomeVillage: source.organisedByHomeVillage,
      outsidePlayerLimit: source.outsidePlayerLimit,
      yellowsForBan: source.yellowsForBan,
      redBanMatches: source.redBanMatches,
      isVolunteer: source.isVolunteer,
      whatsappLink: source.whatsappLink,
      published: false,
      order: await nextOrder(),
    },
  });

  return { activity, sourceId: source.id };
}

export async function deleteActivity(id: string) {
  const activity = await prisma.activity.findUnique({ where: { id } });
  if (!activity) throw new NotFoundError(activities.notFound);

  await prisma.activity.delete({ where: { id } });
  return activity;
}
