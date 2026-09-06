import { prisma } from "./prisma";
import { ConflictError, ValidationError } from "./errors";
import { bracketRoundLabel, getMatchWinnerTeamId, shuffleArray } from "./tournament";
import { drawFirstRound, type BracketSlot } from "./bracketDraw";
import { computeStandings } from "./standings";
import { suggestFirstKnockoutRound } from "./bracketSuggestion";
import { incompleteTeams, displayTeamName, squadOf, OPEN_SQUAD } from "./squadSize";
import { entrantWording, tournament as messages } from "./messages";
import type { EntrantWording } from "./messages";
import { entrantOfActivity } from "./entrantServer";
import { nameOf } from "./person";
import { entrantKind } from "./entrant";
import {
  bothSidesKnown,
  matchSideIds,
  matchSideTeams,
  noSideKnown,
  sideIdData,
} from "./matchSides";
import type { MatchShape } from "@prisma/client";

async function nextMatchOrder(activityId: string) {
  const row = await prisma.match.findFirst({
    where: { activityId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  return (row?.order || 0) + 1;
}

interface BracketRow {
  id: string;
  bracketRound: number | null;
  order: number;
  status: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  sideATeamId: string | null;
  sideBTeamId: string | null;
}

async function matchShapeOf(activityId: string): Promise<MatchShape> {
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: { matchShape: true },
  });
  return activity?.matchShape ?? "FOOTBALL";
}

async function bracketRows(activityId: string): Promise<BracketRow[]> {
  return prisma.match.findMany({
    where: { activityId, bracketRound: { not: null } },
    orderBy: [{ bracketRound: "asc" }, { order: "asc" }],
    select: {
      id: true,
      bracketRound: true,
      order: true,
      status: true,
      homeTeamId: true,
      awayTeamId: true,
      sideATeamId: true,
      sideBTeamId: true,
    },
  });
}

async function clearRedoableBracket(
  activityId: string,
  redo: boolean,
  shape: MatchShape,
): Promise<BracketRow[]> {
  const bracket = await bracketRows(activityId);
  if (bracket.length === 0) return [];

  const drawn = bracket.filter((m) => !noSideKnown(m, shape));
  if (drawn.length === 0) return bracket;
  if (!redo) throw new ConflictError(messages.bracketExists);
  const withResults = bracket.filter((m) => m.status === "PLAYED" && bothSidesKnown(m, shape));
  if (withResults.length > 0) throw new ConflictError(messages.bracketHasResults);

  await prisma.match.updateMany({
    where: { id: { in: drawn.map((m) => m.id) } },
    data: { ...sideIdData(shape, null, null), status: "SCHEDULED" },
  });
  return bracket;
}

interface DrawnSlot {
  firstTeamId: string;
  secondTeamId: string | null;
  status: "SCHEDULED" | "PLAYED";
}

function drawnSlot(slot: BracketSlot<{ id: string }>): DrawnSlot {
  return {
    firstTeamId: slot.home.id,
    secondTeamId: slot.away?.id ?? null,
    status: slot.away ? "SCHEDULED" : "PLAYED",
  };
}

function slotData(slot: DrawnSlot, shape: MatchShape) {
  return { ...sideIdData(shape, slot.firstTeamId, slot.secondTeamId), status: slot.status };
}

async function createFirstRound(
  activityId: string,
  slots: DrawnSlot[],
  label: string,
  shape: MatchShape,
) {
  let order = await nextMatchOrder(activityId);
  await prisma.match.createMany({
    data: slots.map((slot) => ({
      activityId,
      ...slotData(slot, shape),
      isKnockout: true,
      bracketRound: 1,
      round: label,
      order: order++,
    })),
  });
  return slots.length;
}

async function fillFirstRound(
  activityId: string,
  waiting: BracketRow[],
  slots: DrawnSlot[],
  label: string,
  shape: MatchShape,
) {
  if (waiting.length === 0) return createFirstRound(activityId, slots, label, shape);

  const seats = waiting.filter((m) => m.bracketRound === 1);
  if (seats.length !== slots.length) {
    throw new ConflictError(messages.bracketSlotsMismatch(seats.length, slots.length));
  }

  for (const [i, seat] of seats.entries()) {
    await prisma.match.update({ where: { id: seat.id }, data: slotData(slots[i], shape) });
  }
  return seats.length;
}

export async function drawBracket(activityId: string, redo = false) {
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: { minTeamSize: true, maxTeamSize: true, matchShape: true },
  });
  const teams = await prisma.team.findMany({
    where: { activityId },
    select: {
      id: true,
      name: true,
      autoNamed: true,
      groupId: true,
      members: { select: { user: { select: { fullName: true } } } },
    },
  });

  const squad = activity ? squadOf(activity) : OPEN_SQUAD;
  const words = entrantWording(entrantKind(squad));
  const short = incompleteTeams(
    teams.map((t) => ({
      id: t.id,
      name: t.name,
      autoNamed: t.autoNamed,
      memberNames: t.members.map((m) => nameOf(m.user)),
    })),
    squad,
  );
  if (short.length > 0) {
    const names = short.map((t) => displayTeamName(t, squad)).join("، ");
    throw new ValidationError(words.entrantsIncomplete(squad.min, squad.max, names));
  }
  if (teams.length < 2) {
    throw new ValidationError(messages.needTwoEntrants);
  }

  const groupsCount = await prisma.group.count({ where: { activityId } });
  if (groupsCount > 0) {
    const leagueMatches = await prisma.match.findMany({
      where: { activityId, isKnockout: false },
      select: { status: true },
    });
    if (leagueMatches.length === 0 || leagueMatches.some((m) => m.status !== "PLAYED")) {
      throw new ConflictError(messages.groupStageIncomplete);
    }
  }

  const shape = activity?.matchShape ?? "FOOTBALL";
  const waiting = await clearRedoableBracket(activityId, redo, shape);

  const slots = drawFirstRound(shuffleArray(teams));
  if (!slots) throw new ValidationError(words.drawGroupsImpossible);

  const label = bracketRoundLabel(slots.length);
  const created = await fillFirstRound(activityId, waiting, slots.map(drawnSlot), label, shape);
  return { created, label };
}

function suggestionError(problem: string, words: EntrantWording): string {
  const reasons: Record<string, string> = {
    notGrouped: messages.bracketNeedsGroups,
    qualifierCount: messages.bracketQualifierCount,
    groupTooSmall: words.groupNeedsTwoEntrants,
    unresolvedTie: messages.bracketTieUnresolved,
  };
  return reasons[problem];
}

async function groupTables(activityId: string) {
  const shape = await matchShapeOf(activityId);
  const [groups, teams, matches] = await Promise.all([
    prisma.group.findMany({
      where: { activityId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }),
    prisma.team.findMany({
      where: { activityId },
      select: { id: true, name: true, groupId: true, logo: true },
    }),
    prisma.match.findMany({
      where: { activityId },
      select: {
        homeTeam: { select: { id: true } },
        awayTeam: { select: { id: true } },
        sideATeam: { select: { id: true } },
        sideBTeam: { select: { id: true } },
        homeScore: true,
        awayScore: true,
        status: true,
        isKnockout: true,
        bookings: { select: { teamId: true, cardType: true } },
      },
    }),
  ]);

  const leagueMatches = matches
    .filter((m) => !m.isKnockout)
    .map((m) => {
      const sides = matchSideTeams(m, shape);
      return { ...m, firstTeam: sides.first, secondTeam: sides.second };
    });
  return {
    groups: groups.map((g) => ({
      id: g.id,
      name: g.name,
      standings: computeStandings(
        teams.filter((t) => t.groupId === g.id),
        leagueMatches,
      ),
    })),
    groupStageComplete:
      leagueMatches.length > 0 && leagueMatches.every((m) => m.status === "PLAYED"),
  };
}

export async function suggestBracket(activityId: string) {
  const shape = await matchShapeOf(activityId);
  const { groups, groupStageComplete } = await groupTables(activityId);
  const suggestion = suggestFirstKnockoutRound(groups);
  const bracket = await bracketRows(activityId);
  const firstRound = bracket.filter((m) => m.bracketRound === 1);
  return {
    ...suggestion,
    label: suggestion.pairs.length ? bracketRoundLabel(suggestion.pairs.length) : null,
    groupStageComplete,
    bracketExists: bracket.length > 0,
    firstRoundWaiting:
      firstRound.length > 0 &&
      bracket.every((m) => m.status === "SCHEDULED") &&
      firstRound.every((m) => noSideKnown(m, shape)),
  };
}

export async function createSuggestedBracket(activityId: string, redo = false) {
  const { groups, groupStageComplete } = await groupTables(activityId);
  if (!groupStageComplete) throw new ConflictError(messages.groupStageIncomplete);

  const { pairs, problem } = suggestFirstKnockoutRound(groups);
  if (!pairs.length) {
    const words = entrantWording(await entrantOfActivity(prisma, activityId));
    throw new ValidationError(suggestionError(problem ?? "notGrouped", words));
  }

  const shape = await matchShapeOf(activityId);
  const waiting = await clearRedoableBracket(activityId, redo, shape);

  const label = bracketRoundLabel(pairs.length);
  const created = await fillFirstRound(
    activityId,
    waiting,
    pairs.map((pair) => ({
      firstTeamId: pair.home.teamId,
      secondTeamId: pair.away.teamId,
      status: "SCHEDULED" as const,
    })),
    label,
    shape,
  );
  return { created, label, problem };
}

export async function advanceBracket(activityId: string) {
  const shape = await matchShapeOf(activityId);
  const bracketMatches = await bracketRows(activityId);
  if (bracketMatches.length === 0) throw new ValidationError(messages.bracketNotStarted);

  const scores = await prisma.match.findMany({
    where: { activityId, bracketRound: { not: null } },
    select: {
      id: true,
      homeScore: true,
      awayScore: true,
      homePenalties: true,
      awayPenalties: true,
    },
  });
  const scoreOf = new Map(scores.map((m) => [m.id, m]));

  const roundNumbers = [...new Set(bracketMatches.map((m) => m.bracketRound as number))].sort(
    (a, b) => a - b,
  );
  const matchesIn = (round: number) => bracketMatches.filter((m) => m.bracketRound === round);
  const playedRounds = roundNumbers.filter((r) => matchesIn(r).every((m) => m.status === "PLAYED"));
  const lastPlayed = playedRounds.at(-1);
  if (lastPlayed === undefined) throw new ConflictError(messages.roundIncomplete);

  const currentRound = matchesIn(lastPlayed);
  if (currentRound.length === 1) throw new ConflictError(messages.alreadyFinal);
  if (currentRound.length % 2 !== 0) throw new ConflictError(messages.oddRound);

  const nextRound = matchesIn(lastPlayed + 1);
  if (nextRound.length > 0 && nextRound.every((m) => matchSideIds(m, shape).first !== null)) {
    throw new ConflictError(messages.roundIncomplete);
  }

  const winners: string[] = [];
  for (const m of currentRound) {
    const score = scoreOf.get(m.id);
    const sides = matchSideIds(m, shape);
    const winner = score
      ? getMatchWinnerTeamId({
          firstTeamId: sides.first,
          secondTeamId: sides.second,
          homeScore: score.homeScore,
          awayScore: score.awayScore,
          homePenalties: score.homePenalties,
          awayPenalties: score.awayPenalties,
          status: m.status,
        })
      : null;
    if (!winner) throw new ConflictError(messages.tieNeedsPenalties);
    winners.push(winner);
  }

  const label = bracketRoundLabel(winners.length / 2);
  const pairs = [];
  for (let i = 0; i < winners.length; i += 2) {
    pairs.push(sideIdData(shape, winners[i], winners[i + 1]));
  }

  if (nextRound.length === pairs.length) {
    for (const [i, slot] of nextRound.entries()) {
      await prisma.match.update({ where: { id: slot.id }, data: pairs[i] });
    }
    return { created: pairs.length, label };
  }

  let order = await nextMatchOrder(activityId);
  await prisma.match.createMany({
    data: pairs.map((pair) => ({
      activityId,
      ...pair,
      isKnockout: true,
      bracketRound: lastPlayed + 1,
      round: label,
      order: order++,
    })),
  });
  return { created: pairs.length, label };
}
