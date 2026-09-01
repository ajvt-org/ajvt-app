import { prisma } from "./prisma";
import { ConflictError, ValidationError } from "./errors";
import {
  bracketRoundLabel,
  drawKnockoutPairs,
  getMatchWinnerTeamId,
  isPowerOfTwo,
  shuffleArray,
} from "./tournament";
import { computeStandings } from "./standings";
import { suggestFirstKnockoutRound } from "./bracketSuggestion";
import { incompleteTeams, displayTeamName } from "./teamSize";
import { tournament as messages } from "./messages";
import { nameOf } from "./person";

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
    },
  });
}

async function clearRedoableBracket(activityId: string, redo: boolean): Promise<BracketRow[]> {
  const bracket = await bracketRows(activityId);
  if (bracket.length === 0) return [];

  const drawn = bracket.filter((m) => m.homeTeamId !== null || m.awayTeamId !== null);
  if (drawn.length === 0) return bracket;
  if (!redo) throw new ConflictError(messages.bracketExists);
  if (bracket.some((m) => m.status === "PLAYED")) {
    throw new ConflictError(messages.bracketHasResults);
  }

  await prisma.match.updateMany({
    where: { id: { in: drawn.map((m) => m.id) } },
    data: { homeTeamId: null, awayTeamId: null },
  });
  return bracket;
}

async function fillFirstRound(
  activityId: string,
  waiting: BracketRow[],
  pairs: { homeTeamId: string; awayTeamId: string }[],
  label: string,
) {
  const slots = waiting.filter((m) => m.bracketRound === 1);
  if (slots.length !== pairs.length) {
    if (waiting.length > 0) {
      await prisma.match.deleteMany({ where: { id: { in: waiting.map((m) => m.id) } } });
    }
    let order = await nextMatchOrder(activityId);
    await prisma.match.createMany({
      data: pairs.map((pair) => ({
        activityId,
        ...pair,
        isKnockout: true,
        bracketRound: 1,
        round: label,
        order: order++,
      })),
    });
    return pairs.length;
  }

  for (const [i, slot] of slots.entries()) {
    await prisma.match.update({ where: { id: slot.id }, data: pairs[i] });
  }
  return slots.length;
}

export async function drawBracket(activityId: string, redo = false) {
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: { teamSize: true },
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

  const short = incompleteTeams(
    teams.map((t) => ({
      id: t.id,
      name: t.name,
      autoNamed: t.autoNamed,
      memberNames: t.members.map((m) => nameOf(m.user)),
    })),
    activity?.teamSize ?? null,
  );
  if (short.length > 0) {
    const names = short.map((t) => displayTeamName(t, activity?.teamSize ?? null)).join("، ");
    throw new ValidationError(messages.teamsIncomplete(activity?.teamSize ?? 0, names));
  }
  if (!isPowerOfTwo(teams.length)) {
    throw new ValidationError(messages.needPowerOfTwo(teams.length));
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

  const waiting = await clearRedoableBracket(activityId, redo);

  const shuffled = shuffleArray(teams);
  const pairs =
    drawKnockoutPairs(shuffled) ??
    Array.from(
      { length: shuffled.length / 2 },
      (_, i): [(typeof shuffled)[0], (typeof shuffled)[0]] => [
        shuffled[2 * i],
        shuffled[2 * i + 1],
      ],
    );

  const label = bracketRoundLabel(pairs.length);
  const created = await fillFirstRound(
    activityId,
    waiting,
    pairs.map(([home, away]) => ({ homeTeamId: home.id, awayTeamId: away.id })),
    label,
  );
  return { created, label };
}

const SUGGESTION_ERROR: Record<string, string> = {
  notGrouped: messages.bracketNeedsGroups,
  qualifierCount: messages.bracketQualifierCount,
  groupTooSmall: messages.groupNeedsTwoTeams,
  unresolvedTie: messages.bracketTieUnresolved,
};

async function groupTables(activityId: string) {
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
        homeScore: true,
        awayScore: true,
        status: true,
        isKnockout: true,
        bookings: { select: { teamId: true, cardType: true } },
      },
    }),
  ]);

  const leagueMatches = matches.filter((m) => !m.isKnockout);
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
  const { groups, groupStageComplete } = await groupTables(activityId);
  const suggestion = suggestFirstKnockoutRound(groups);
  const existing = await prisma.match.count({
    where: { activityId, bracketRound: { not: null } },
  });
  return {
    ...suggestion,
    label: suggestion.pairs.length ? bracketRoundLabel(suggestion.pairs.length) : null,
    groupStageComplete,
    bracketExists: existing > 0,
  };
}

export async function createSuggestedBracket(activityId: string, redo = false) {
  const { groups, groupStageComplete } = await groupTables(activityId);
  if (!groupStageComplete) throw new ConflictError(messages.groupStageIncomplete);

  const { pairs, problem } = suggestFirstKnockoutRound(groups);
  if (!pairs.length) throw new ValidationError(SUGGESTION_ERROR[problem ?? "notGrouped"]);

  const waiting = await clearRedoableBracket(activityId, redo);

  const label = bracketRoundLabel(pairs.length);
  const created = await fillFirstRound(
    activityId,
    waiting,
    pairs.map((pair) => ({ homeTeamId: pair.home.teamId, awayTeamId: pair.away.teamId })),
    label,
  );
  return { created, label, problem };
}

export async function advanceBracket(activityId: string) {
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
  if (nextRound.length > 0 && nextRound.every((m) => m.homeTeamId !== null)) {
    throw new ConflictError(messages.roundIncomplete);
  }

  const winners: string[] = [];
  for (const m of currentRound) {
    const score = scoreOf.get(m.id);
    const winner = score
      ? getMatchWinnerTeamId({
          homeTeamId: m.homeTeamId,
          awayTeamId: m.awayTeamId,
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
    pairs.push({ homeTeamId: winners[i], awayTeamId: winners[i + 1] });
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
