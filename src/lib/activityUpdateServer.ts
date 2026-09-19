import { prisma } from "./prisma";
import { ConflictError, NotFoundError, ValidationError } from "./errors";
import { activities, entrantWording, tournament } from "./messages";
import { PLAYED_MATCH } from "./activityMatches";
import { entrantOf } from "./entrantServer";
import { normalizePlayerCount } from "./squadSize";
import { colourProblem } from "./seriesSetup";
import { reconcileSeats } from "./registrationTeamServer";
import { given, volunteerProblem, type ActivityData, type ActivityEdit } from "./activityFields";

export async function updateActivity(id: string, input: ActivityEdit) {
  const existing = await prisma.activity.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(activities.notFound);

  const fixtureCount = () => prisma.match.count({ where: { activityId: id } });
  const playedCount = () => prisma.match.count({ where: { activityId: id, ...PLAYED_MATCH } });

  const data: ActivityData = {};

  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.period !== undefined) data.period = input.period?.trim() || null;
  if (input.capacity !== undefined) data.capacity = input.capacity;
  if (input.isOpen !== undefined) data.isOpen = !!input.isOpen;
  if (input.autoApprove !== undefined) data.autoApprove = !!input.autoApprove;
  if (input.photo !== undefined) data.photo = input.photo;
  if (input.isTournament !== undefined) data.isTournament = !!input.isTournament;
  if (input.showScorersAndCards !== undefined) {
    data.showScorersAndCards = !!input.showScorersAndCards;
  }
  if (input.format !== undefined) {
    if (input.format !== existing.format && (await fixtureCount()) > 0) {
      throw new ConflictError(tournament.formatLocked);
    }
    data.format = input.format ?? null;
  }
  if (input.minTeamSize !== undefined || input.maxTeamSize !== undefined) {
    const nextMinTeamSize =
      input.minTeamSize !== undefined
        ? normalizePlayerCount(input.minTeamSize)
        : existing.minTeamSize;
    const nextMaxTeamSize =
      input.maxTeamSize !== undefined
        ? normalizePlayerCount(input.maxTeamSize)
        : existing.maxTeamSize;
    const moved =
      nextMinTeamSize !== existing.minTeamSize || nextMaxTeamSize !== existing.maxTeamSize;
    if (moved && (await playedCount()) > 0) {
      throw new ConflictError(entrantWording(entrantOf(existing)).squadSizeLocked);
    }
    if (input.minTeamSize !== undefined) data.minTeamSize = nextMinTeamSize;
    if (input.maxTeamSize !== undefined) data.maxTeamSize = nextMaxTeamSize;
  }
  if (input.organisedByHomeVillage !== undefined) {
    data.organisedByHomeVillage = !!input.organisedByHomeVillage;
  }
  if (input.playersBuildTeams !== undefined) {
    data.playersBuildTeams = !!input.playersBuildTeams;
  }
  if (input.outsidePlayerLimit !== undefined) {
    data.outsidePlayerLimit = normalizePlayerCount(input.outsidePlayerLimit);
  }
  if (input.matchShape !== undefined) {
    if (input.matchShape !== existing.matchShape && (await fixtureCount()) > 0) {
      throw new ConflictError(tournament.matchShapeLocked);
    }
    data.matchShape = input.matchShape;
  }
  const colours = {
    hasColours: input.hasColours,
    firstColourWord: input.firstColourWord,
    secondColourWord: input.secondColourWord,
  };
  if (Object.values(colours).some((value) => value !== undefined)) {
    const wanted = { ...existing, ...given(colours) };
    const moved = Object.entries(given(colours)).some(
      ([key, value]) => (existing as Record<string, unknown>)[key] !== value,
    );
    if (moved && (await playedCount()) > 0) {
      throw new ConflictError(tournament.seriesConfigLocked);
    }
    const problem = colourProblem(wanted);
    if (problem) throw new ValidationError(tournament.seriesSetup[problem]);
    Object.assign(data, given(colours));
  }
  if (input.yellowsForBan !== undefined) data.yellowsForBan = input.yellowsForBan;
  if (input.redBanMatches !== undefined) data.redBanMatches = input.redBanMatches;
  if (input.mvpVoteMinutes !== undefined) data.mvpVoteMinutes = input.mvpVoteMinutes;
  if (input.isVolunteer !== undefined) data.isVolunteer = !!input.isVolunteer;
  if (input.published !== undefined) data.published = !!input.published;
  if (input.whatsappLink !== undefined) data.whatsappLink = input.whatsappLink?.trim() || null;
  if (input.order !== undefined) data.order = Number(input.order);
  if (input.startsAt !== undefined) data.startsAt = input.startsAt;
  if (input.endsAt !== undefined) data.endsAt = input.endsAt;
  if (input.withTime !== undefined) data.withTime = !!input.withTime;

  const nextIsVolunteer = data.isVolunteer ?? existing.isVolunteer;
  const problem = volunteerProblem({
    isTournament: data.isTournament ?? existing.isTournament,
    isVolunteer: nextIsVolunteer,
    whatsappLink: data.whatsappLink !== undefined ? data.whatsappLink : existing.whatsappLink,
  });
  if (problem) throw new ValidationError(problem);

  const pending =
    nextIsVolunteer && !existing.isVolunteer
      ? await prisma.activityRegistration.count({ where: { activityId: id, status: "PENDING" } })
      : 0;
  if (pending > 0 && !input.settlePending) {
    throw new ConflictError(activities.pendingBeforeCampaign, { pending });
  }
  const settled = pending > 0 ? (input.settlePending === "accept" ? "ACTIVE" : "REJECTED") : null;

  const reshaped =
    data.isTournament !== undefined ||
    data.minTeamSize !== undefined ||
    data.maxTeamSize !== undefined;

  const activity = await prisma.$transaction(async (tx) => {
    if (settled) {
      await tx.activityRegistration.updateMany({
        where: { activityId: id, status: "PENDING" },
        data: { status: settled },
      });
    }
    const updated = await tx.activity.update({ where: { id }, data });
    if (reshaped || settled) await reconcileSeats(tx, id);
    return updated;
  });

  return { activity, existing, settled, pending };
}
