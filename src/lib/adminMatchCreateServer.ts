import { prisma } from "./prisma";
import { ValidationError } from "./errors";
import { entrantWording, tournament } from "./messages";
import { entrantOfActivity } from "./entrantServer";
import { isValidLeaguePairing } from "./tournament";
import { parseMatchDate } from "./clubTime";
import { dayForMatchDate } from "./tournamentDaysServer";
import { sideIdData } from "./matchSides";
import { MATCH_INCLUDE } from "./adminMatchesServer";

const ROUND_MAX = 40;
const VENUE_MAX = 60;

export interface NewMatch {
  firstTeamId?: unknown;
  secondTeamId?: unknown;
  matchDate?: unknown;
  round?: unknown;
  venue?: unknown;
  isKnockout?: unknown;
}

function text(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

export async function createActivityMatch(activityId: string, input: NewMatch) {
  const activity = await prisma.activity.findUniqueOrThrow({
    where: { id: activityId },
    select: { matchShape: true },
  });
  const entrant = await entrantOfActivity(prisma, activityId);
  const words = entrantWording(entrant);

  const firstTeamId = text(input.firstTeamId);
  const secondTeamId = text(input.secondTeamId);
  if (!firstTeamId || !secondTeamId) throw new ValidationError(words.bothEntrantsRequired);
  if (firstTeamId === secondTeamId) throw new ValidationError(words.entrantAgainstItself);

  const teams = await prisma.team.findMany({
    where: { id: { in: [firstTeamId, secondTeamId] }, activityId },
    select: { id: true, name: true, groupId: true },
  });
  if (teams.length !== 2) throw new ValidationError(words.entrantsNotInTournament);

  const first = teams.find((team) => team.id === firstTeamId)!;
  const second = teams.find((team) => team.id === secondTeamId)!;
  const isKnockout = !!input.isKnockout;
  if (!isValidLeaguePairing(isKnockout, first.groupId, second.groupId)) {
    throw new ValidationError(tournament.leaguePairingAcrossGroups);
  }

  const round = text(input.round);
  if (round.length > ROUND_MAX) throw new ValidationError(tournament.roundNameTooLong);
  const venue = text(input.venue);
  if (venue.length > VENUE_MAX) throw new ValidationError(tournament.venueNameTooLong);

  const when = input.matchDate ? parseMatchDate(input.matchDate as string) : null;
  const dayId = await dayForMatchDate(activityId, when);

  const last = await prisma.match.findFirst({
    where: { activityId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const match = await prisma.match.create({
    data: {
      activityId,
      ...sideIdData(activity.matchShape, firstTeamId, secondTeamId),
      matchDate: when,
      dayId: dayId ?? null,
      round: round || null,
      venue: venue || null,
      isKnockout,
      order: (last?.order || 0) + 1,
    },
    include: MATCH_INCLUDE,
  });

  return { match, first, second, entrant };
}
