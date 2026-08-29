// The knockout generators. A draw shuffles then pairs round one so no tie is
// an all-one-group affair when the field allows it; redo wipes a round-one
// bracket with no results and draws again. Crossed semis come from the two
// group tables; advancing pairs the winners of a fully-played round.

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

export async function semisFromGroups(activityId: string, redo = false) {
  const groups = await prisma.group.findMany({
    where: { activityId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });
  if (groups.length !== 2) throw new ValidationError(messages.needTwoGroups);

  const [teams, matches] = await Promise.all([
    prisma.team.findMany({
      where: { activityId },
      select: { id: true, name: true, groupId: true },
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
      },
    }),
  ]);

  const leagueMatches = matches.filter((m) => !m.isKnockout);
  if (leagueMatches.some((m) => m.status !== "PLAYED")) {
    throw new ConflictError(messages.groupStageIncomplete);
  }

  const teamsA = teams.filter((t) => t.groupId === groups[0].id);
  const teamsB = teams.filter((t) => t.groupId === groups[1].id);
  if (teamsA.length < 2 || teamsB.length < 2) {
    throw new ValidationError(messages.groupNeedsTwoTeams);
  }

  await clearRedoableBracket(activityId, redo);

  const standingsA = computeStandings(teamsA, leagueMatches);
  const standingsB = computeStandings(teamsB, leagueMatches);

  let order = await nextMatchOrder(activityId);
  const label = bracketRoundLabel(2);
  const data = [
    [standingsA[0].teamId, standingsB[1].teamId],
    [standingsB[0].teamId, standingsA[1].teamId],
  ].map(([homeTeamId, awayTeamId]) => ({
    activityId,
    homeTeamId,
    awayTeamId,
    isKnockout: true,
    bracketRound: 1,
    round: label,
    order: order++,
  }));
  await prisma.match.createMany({ data });
  return { created: data.length, groups: `${groups[0].name} × ${groups[1].name}` };
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
