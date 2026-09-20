import { prisma } from "./prisma";
import { NotFoundError, ValidationError } from "./errors";
import { entrantWording, tournament } from "./messages";
import { entrantOf } from "./entrantServer";
import { isFootball } from "./matchShape";
import { kickoffPassed } from "./matchKickoff";
import { matchSideTeams } from "./matchSides";
import { parseScorePair, type GoalEvent, type GoalInput, type KickEvent } from "./matchInput";
import { goalEventOutcome } from "./matchGoalEventsServer";
import { scoreEntryOutcome } from "./matchScoreEntryServer";
import {
  applyForfeit,
  applyForfeitAward,
  applyManOfTheMatch,
  applyPenalties,
  refuseSuspendedPlayers,
} from "./matchResultFieldsServer";
import { scheduleChanges, type ScheduleEdit } from "./matchScheduleServer";
import { scheduleMatch, writeMatchUpdate } from "./matchAdminWriteServer";

const SIDE_TEAM = { select: { id: true, name: true, groupId: true } } as const;

export async function loadMatchForEdit(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      homeTeam: SIDE_TEAM,
      awayTeam: SIDE_TEAM,
      sideATeam: SIDE_TEAM,
      sideBTeam: SIDE_TEAM,
      activity: { select: { matchShape: true, minTeamSize: true, maxTeamSize: true } },
    },
  });
  if (!match) throw new NotFoundError(tournament.matchNotFound);
  return match;
}

export type EditableMatch = Awaited<ReturnType<typeof loadMatchForEdit>>;

export interface MatchEdit extends ScheduleEdit {
  homeScore?: unknown;
  awayScore?: unknown;
  homeGoals?: unknown;
  awayGoals?: unknown;
  homePenalties?: unknown;
  awayPenalties?: unknown;
  manOfTheMatchId?: string | null;
  goalEvents?: unknown;
  penaltyKicks?: unknown;
  forfeitWinnerTeamId?: string | null;
  forfeitExtraGoals?: unknown;
}

const RESULT_FIELDS = [
  "homeScore",
  "awayScore",
  "homeGoals",
  "awayGoals",
  "homePenalties",
  "awayPenalties",
  "manOfTheMatchId",
  "goalEvents",
  "penaltyKicks",
  "forfeitWinnerTeamId",
  "forfeitExtraGoals",
] as const;

function touchesTheResult(edit: MatchEdit): boolean {
  return RESULT_FIELDS.some((field) => edit[field] !== undefined);
}

export async function updateMatch(matchId: string, edit: MatchEdit) {
  const match = await loadMatchForEdit(matchId);
  const entrant = entrantOf(match.activity);
  const words = entrantWording(entrant);
  const shape = match.activity.matchShape;
  const wasPlayed = match.status === "PLAYED";
  const standing = matchSideTeams(match, shape);

  const { data, sides } = await scheduleChanges(match, edit, words);

  if (sides === null) {
    if (touchesTheResult(edit)) throw new ValidationError(words.fixtureHasNoEntrants);
    return { match: await scheduleMatch(matchId, data), report: null };
  }

  const eventsMode = edit.goalEvents !== undefined;
  const enteringResult =
    !eventsMode && (edit.homeScore !== undefined || edit.awayScore !== undefined);
  const resultArriving =
    eventsMode || (enteringResult && parseScorePair(edit.homeScore, edit.awayScore) !== null);
  if (resultArriving && !isFootball(shape)) {
    throw new ValidationError(tournament.seriesResultNotReady);
  }

  let events: { goals: GoalEvent[]; kicks: KickEvent[] } | null = null;
  let entry: { cleared: boolean; homeGoals: GoalInput[]; awayGoals: GoalInput[] } | null = null;

  if (eventsMode) {
    const outcome = await goalEventOutcome(edit.goalEvents, edit.penaltyKicks, {
      sides,
      knockout: data.isKnockout ?? match.isKnockout,
      forfeitWinnerTeamId:
        edit.forfeitWinnerTeamId === undefined
          ? match.forfeitWinnerTeamId
          : edit.forfeitWinnerTeamId,
    });
    data.homeScore = outcome.score.home;
    data.awayScore = outcome.score.away;
    data.status = "PLAYED";
    data.homePenalties = outcome.penalties.home;
    data.awayPenalties = outcome.penalties.away;
    events = { goals: outcome.goals, kicks: outcome.kicks };
  }

  if (enteringResult) {
    const outcome = await scoreEntryOutcome(edit, sides);
    if (outcome.cleared) {
      data.homeScore = null;
      data.awayScore = null;
      data.homePenalties = null;
      data.awayPenalties = null;
      data.status = "SCHEDULED";
      entry = { cleared: true, homeGoals: [], awayGoals: [] };
    } else {
      data.homeScore = outcome.score.home;
      data.awayScore = outcome.score.away;
      data.status = "PLAYED";
      entry = { cleared: false, homeGoals: outcome.homeGoals, awayGoals: outcome.awayGoals };
    }
  }

  if (edit.homePenalties !== undefined || edit.awayPenalties !== undefined) {
    applyPenalties(data, match, edit.homePenalties, edit.awayPenalties);
  }
  if (edit.forfeitWinnerTeamId !== undefined) {
    await applyForfeit(data, match, edit.forfeitWinnerTeamId, sides, words, eventsMode);
  }
  if (edit.forfeitExtraGoals !== undefined) {
    applyForfeitAward(data, match, edit.forfeitExtraGoals);
  }
  if (edit.manOfTheMatchId !== undefined) {
    await applyManOfTheMatch(data, match, edit.manOfTheMatchId, sides);
  }

  if (data.status === "PLAYED" && !wasPlayed) {
    const kickoff = data.matchDate !== undefined ? data.matchDate : match.matchDate;
    if (!kickoffPassed(kickoff, new Date())) {
      throw new ValidationError(tournament.resultBeforeKickoff);
    }
  }

  if (enteringResult || eventsMode) {
    await refuseSuspendedPlayers(match.activityId, data, events, entry);
  }

  const before = {
    forfeitWinnerTeamId: match.forfeitWinnerTeamId,
    forfeitExtraGoals: match.forfeitExtraGoals,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    status: match.status,
  };

  const updated = await writeMatchUpdate({
    matchId,
    data,
    sides,
    events,
    entry,
    serveSuspensionsFor:
      (enteringResult || eventsMode) && data.status === "PLAYED" && !match.suspensionsServedAt
        ? match.activityId
        : null,
  });

  return {
    match: updated,
    report: {
      before,
      applied: data,
      entrant,
      sides,
      wasPlayed,
      activityId: match.activityId,
      homeName: standing.first?.name ?? words.entrantNotSetYet,
      awayName: standing.second?.name ?? words.entrantNotSetYet,
      resultEntered: (enteringResult || eventsMode) && data.status === "PLAYED",
      forfeitTouched:
        edit.forfeitWinnerTeamId !== undefined || edit.forfeitExtraGoals !== undefined,
      forfeitWinnerTeamId:
        data.forfeitWinnerTeamId !== undefined
          ? data.forfeitWinnerTeamId
          : match.forfeitWinnerTeamId,
      forfeitExtraGoals:
        data.forfeitExtraGoals !== undefined ? data.forfeitExtraGoals : match.forfeitExtraGoals,
    },
  };
}
