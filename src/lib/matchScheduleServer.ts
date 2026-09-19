import { prisma } from "./prisma";
import { ValidationError } from "./errors";
import { tournament, type EntrantWording } from "./messages";
import { isValidLeaguePairing, knockoutToggleAllowed } from "./tournament";
import { parseMatchDate } from "./clubTime";
import { dayForMatchDate } from "./tournamentDaysServer";
import { matchSideIds, matchSideTeams, sideIdData } from "./matchSides";
import type { MatchData } from "./matchAdminWriteServer";
import type { Sides } from "./matchGoalEventsServer";
import type { EditableMatch } from "./matchUpdateServer";

export interface ScheduleEdit {
  firstTeamId?: string | null;
  secondTeamId?: string | null;
  matchDate?: string | null;
  round?: string | null;
  venue?: string | null;
  isKnockout?: unknown;
  order?: unknown;
}

export async function scheduleChanges(
  match: EditableMatch,
  edit: ScheduleEdit,
  words: EntrantWording,
): Promise<{ data: MatchData; sides: Sides | null }> {
  const shape = match.activity.matchShape;
  const standing = matchSideTeams(match, shape);
  const held = matchSideIds(match, shape);
  const data: MatchData = {};

  let first = held.first;
  let second = held.second;
  let firstGroupId = standing.first?.groupId ?? null;
  let secondGroupId = standing.second?.groupId ?? null;

  if (edit.firstTeamId !== undefined || edit.secondTeamId !== undefined) {
    const nextFirst = edit.firstTeamId !== undefined ? edit.firstTeamId : held.first;
    const nextSecond = edit.secondTeamId !== undefined ? edit.secondTeamId : held.second;
    if (nextFirst === null || nextSecond === null) {
      throw new ValidationError(words.fixtureNeedsBothEntrants);
    }
    if (nextFirst === nextSecond) throw new ValidationError(words.entrantAgainstItself);

    const teams = await prisma.team.findMany({
      where: { id: { in: [nextFirst, nextSecond] }, activityId: match.activityId },
      select: { id: true, groupId: true },
    });
    if (teams.length !== 2) throw new ValidationError(words.entrantsNotInTournament);

    Object.assign(data, sideIdData(shape, nextFirst, nextSecond));
    first = nextFirst;
    second = nextSecond;
    firstGroupId = teams.find((team) => team.id === nextFirst)!.groupId;
    secondGroupId = teams.find((team) => team.id === nextSecond)!.groupId;
  }

  if (edit.matchDate !== undefined) {
    const when = edit.matchDate ? parseMatchDate(edit.matchDate) : null;
    data.matchDate = when;
    const dayId = await dayForMatchDate(match.activityId, when);
    if (dayId !== undefined) data.dayId = dayId;
  }
  if (edit.round !== undefined) data.round = edit.round?.trim() || null;
  if (edit.venue !== undefined) data.venue = edit.venue?.trim() || null;
  if (edit.isKnockout !== undefined) data.isKnockout = !!edit.isKnockout;

  const knockout = edit.isKnockout !== undefined ? !!edit.isKnockout : match.isKnockout;
  if (
    knockout &&
    !knockoutToggleAllowed(match.isKnockout, match.bracketRound, firstGroupId, secondGroupId)
  ) {
    throw new ValidationError(tournament.groupFixtureNotKnockout);
  }
  if (!isValidLeaguePairing(knockout, firstGroupId, secondGroupId)) {
    throw new ValidationError(tournament.leaguePairing);
  }
  if (edit.order !== undefined) data.order = Number(edit.order);

  return { data, sides: first !== null && second !== null ? { first, second } : null };
}
