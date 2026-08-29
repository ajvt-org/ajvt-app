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

async function clearRedoableBracket(activityId: string, redo: boolean) {
  const bracket = await prisma.match.findMany({
    where: { activityId, bracketRound: { not: null } },
    select: { id: true, bracketRound: true, status: true },
  });
  if (bracket.length === 0) return;
  if (!redo) throw new ConflictError(messages.bracketExists);
  if (bracket.some((m) => m.bracketRound !== 1 || m.status === "PLAYED")) {
    throw new ConflictError(messages.bracketHasResults);
  }
  await prisma.match.deleteMany({ where: { id: { in: bracket.map((m) => m.id) } } });
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
      members: { select: { member: { select: { user: { select: { fullName: true } } } } } },
    },
  });

  const short = incompleteTeams(
    teams.map((t) => ({
      id: t.id,
      name: t.name,
      autoNamed: t.autoNamed,
      memberNames: t.members.map((m) => nameOf(m.member.user)),
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

  await clearRedoableBracket(activityId, redo);

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

  let order = await nextMatchOrder(activityId);
  const label = bracketRoundLabel(pairs.length);
  const data = pairs.map(([home, away]) => ({
    activityId,
    homeTeamId: home.id,
    awayTeamId: away.id,
    isKnockout: true,
    bracketRound: 1,
    round: label,
    order: order++,
  }));
  await prisma.match.createMany({ data });
  return { created: data.length, label };
}

const SUGGESTION_ERROR: Record<string, string> = {
  notGrouped: messages.bracketNeedsGroups,
  groupCount: messages.bracketGroupCount,
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

  await clearRedoableBracket(activityId, redo);

  let order = await nextMatchOrder(activityId);
  const label = bracketRoundLabel(pairs.length);
  const data = pairs.map((pair) => ({
    activityId,
    homeTeamId: pair.home.teamId,
    awayTeamId: pair.away.teamId,
    isKnockout: true,
    bracketRound: 1,
    round: label,
    order: order++,
  }));
  await prisma.match.createMany({ data });
  return { created: data.length, label, problem };
}

export async function advanceBracket(activityId: string) {
  const bracketMatches = await prisma.match.findMany({
    where: { activityId, bracketRound: { not: null } },
    orderBy: [{ bracketRound: "desc" }, { order: "asc" }],
    select: {
      id: true,
      bracketRound: true,
      order: true,
      homeTeamId: true,
      awayTeamId: true,
      homeScore: true,
      awayScore: true,
      homePenalties: true,
      awayPenalties: true,
      status: true,
    },
  });

  if (bracketMatches.length === 0) throw new ValidationError(messages.bracketNotStarted);

  const maxRound = bracketMatches[0].bracketRound as number;
  const currentRound = bracketMatches
    .filter((m) => m.bracketRound === maxRound)
    .sort((a, b) => a.order - b.order);

  if (currentRound.length === 1) throw new ConflictError(messages.alreadyFinal);
  if (currentRound.length % 2 !== 0) throw new ConflictError(messages.oddRound);
  if (currentRound.some((m) => m.status !== "PLAYED")) {
    throw new ConflictError(messages.roundIncomplete);
  }

  const winners: string[] = [];
  for (const m of currentRound) {
    const winner = getMatchWinnerTeamId(m);
    if (!winner) throw new ConflictError(messages.tieNeedsPenalties);
    winners.push(winner);
  }

  let order = await nextMatchOrder(activityId);
  const label = bracketRoundLabel(winners.length / 2);
  const data = [];
  for (let i = 0; i < winners.length; i += 2) {
    data.push({
      activityId,
      homeTeamId: winners[i],
      awayTeamId: winners[i + 1],
      isKnockout: true,
      bracketRound: maxRound + 1,
      round: label,
      order: order++,
    });
  }
  await prisma.match.createMany({ data });
  return { created: data.length, label };
}
