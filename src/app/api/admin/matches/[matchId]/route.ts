import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMatchAccess } from "@/lib/activityAccessServer";
import { logAction, auditContext } from "@/lib/audit";
import { notifyTeams } from "@/lib/tournamentNotify";
import { serveMatch, suspendedUserIds } from "@/lib/suspensionServer";
import { isValidLeaguePairing, knockoutToggleAllowed } from "@/lib/tournament";
import { parseMatchDate } from "@/lib/clubTime";
import { kickoffPassed } from "@/lib/matchKickoff";
import { withRoute } from "@/lib/route";
import { logger } from "@/lib/logger";
import {
  validateGoals,
  validateGoalEvents,
  validateKicks,
  scoreFromGoals,
  shootoutFromKicks,
  parseScorePair,
  type GoalEvent,
  type GoalInput,
  type KickEvent,
} from "@/lib/matchInput";
import { forfeitScore } from "@/lib/forfeit";
import {
  extraTimeAllowed,
  hasExtraTime,
  kicksAllowed,
  kicksAlternate,
  playedScore,
} from "@/lib/matchScores";
import { parse } from "@/lib/validation";
import { matchUpdateSchema } from "./schema";
import type { MatchStatus } from "@prisma/client";
import { entrantWording, notify, tournament } from "@/lib/messages";
import { isFootball } from "@/lib/matchShape";
import { entrantOf, entrantOfMatch } from "@/lib/entrantServer";
import { matchSideIds, matchSideTeams, sideIdData } from "@/lib/matchSides";

const SIDE_TEAM = { select: { id: true, name: true, groupId: true } } as const;

const MATCH_INCLUDE = {
  homeTeam: { select: { id: true, name: true, logo: true } },
  awayTeam: { select: { id: true, name: true, logo: true } },
  sideATeam: { select: { id: true, name: true, logo: true } },
  sideBTeam: { select: { id: true, name: true, logo: true } },
  manOfTheMatchUser: { select: { fullName: true, photo: true } },
  goals: {
    orderBy: { minute: "asc" },
    select: {
      id: true,
      count: true,
      minute: true,
      teamId: true,
      kind: true,
      period: true,
      userId: true,
      user: { select: { fullName: true, photo: true } },
    },
  },
  penaltyKicks: {
    orderBy: { order: "asc" },
    select: {
      id: true,
      teamId: true,
      order: true,
      scored: true,
      userId: true,
      user: { select: { fullName: true, photo: true } },
    },
  },
  bookings: {
    orderBy: { minute: "asc" },
    select: {
      id: true,
      cardType: true,
      minute: true,
      teamId: true,
      userId: true,
      user: { select: { fullName: true, photo: true } },
    },
  },
  mvpVote: {
    select: {
      id: true,
      status: true,
      candidates: {
        select: {
          id: true,
          userId: true,
          user: { select: { fullName: true } },
          _count: { select: { votes: true } },
        },
      },
    },
  },
} as const;

export const PATCH = withRoute(
  "PATCH /api/admin/matches/[matchId]",
  async (req: NextRequest, { params }: { params: Promise<{ matchId: string }> }) => {
    const { matchId } = await params;
    const session = await requireMatchAccess(matchId);
    const {
      homeScore,
      awayScore,
      homeGoals,
      awayGoals,
      matchDate,
      round,
      venue,
      isKnockout,
      order,
      homePenalties,
      awayPenalties,
      manOfTheMatchId,
      firstTeamId,
      secondTeamId,
      goalEvents,
      penaltyKicks,
      forfeitWinnerTeamId,
    } = parse(matchUpdateSchema, await req.json());

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
    if (!match) {
      return NextResponse.json({ error: tournament.matchNotFound }, { status: 404 });
    }
    const entrant = entrantOf(match.activity);
    const words = entrantWording(entrant);
    const wasPlayed = match.status === "PLAYED";
    const shape = match.activity.matchShape;
    const standing = matchSideTeams(match, shape);
    let finalFirstGroupId = standing.first?.groupId ?? null;
    let finalSecondGroupId = standing.second?.groupId ?? null;

    const updateData: {
      matchDate?: Date | null;
      round?: string | null;
      venue?: string | null;
      order?: number;
      isKnockout?: boolean;
      homeScore?: number | null;
      awayScore?: number | null;
      homePenalties?: number | null;
      awayPenalties?: number | null;
      manOfTheMatchUserId?: string | null;
      forfeitWinnerTeamId?: string | null;
      status?: MatchStatus;
      suspensionsServedAt?: Date;
      homeTeamId?: string;
      awayTeamId?: string;
      sideATeamId?: string;
      sideBTeamId?: string;
    } = {};

    const held = matchSideIds(match, shape);
    let firstSideId = held.first;
    let secondSideId = held.second;

    if (firstTeamId !== undefined || secondTeamId !== undefined) {
      const newFirst = firstTeamId !== undefined ? firstTeamId : held.first;
      const newSecond = secondTeamId !== undefined ? secondTeamId : held.second;
      if (newFirst === null || newSecond === null) {
        return NextResponse.json({ error: words.fixtureNeedsBothEntrants }, { status: 400 });
      }
      if (newFirst === newSecond) {
        return NextResponse.json({ error: words.entrantAgainstItself }, { status: 400 });
      }
      const validTeams = await prisma.team.findMany({
        where: { id: { in: [newFirst, newSecond] }, activityId: match.activityId },
        select: { id: true, groupId: true },
      });
      if (validTeams.length !== 2) {
        return NextResponse.json({ error: words.entrantsNotInTournament }, { status: 400 });
      }
      Object.assign(updateData, sideIdData(shape, newFirst, newSecond));
      firstSideId = newFirst;
      secondSideId = newSecond;
      finalFirstGroupId = validTeams.find((t) => t.id === newFirst)!.groupId;
      finalSecondGroupId = validTeams.find((t) => t.id === newSecond)!.groupId;
    }

    const sides =
      firstSideId !== null && secondSideId !== null
        ? { first: firstSideId, second: secondSideId }
        : null;

    if (matchDate !== undefined) {
      updateData.matchDate = matchDate ? parseMatchDate(matchDate) : null;
    }
    if (round !== undefined) {
      updateData.round = round?.trim() || null;
    }
    if (venue !== undefined) {
      updateData.venue = venue?.trim() || null;
    }
    if (isKnockout !== undefined) {
      updateData.isKnockout = !!isKnockout;
    }
    const finalIsKnockout = isKnockout !== undefined ? !!isKnockout : match.isKnockout;
    if (
      finalIsKnockout &&
      !knockoutToggleAllowed(
        match.isKnockout,
        match.bracketRound,
        finalFirstGroupId,
        finalSecondGroupId,
      )
    ) {
      return NextResponse.json({ error: tournament.groupFixtureNotKnockout }, { status: 400 });
    }
    if (!isValidLeaguePairing(finalIsKnockout, finalFirstGroupId, finalSecondGroupId)) {
      return NextResponse.json({ error: tournament.leaguePairing }, { status: 400 });
    }
    if (order !== undefined) {
      updateData.order = Number(order);
    }

    if (sides === null) {
      const touchesTheMatch =
        homeScore !== undefined ||
        awayScore !== undefined ||
        homeGoals !== undefined ||
        awayGoals !== undefined ||
        homePenalties !== undefined ||
        awayPenalties !== undefined ||
        manOfTheMatchId !== undefined ||
        goalEvents !== undefined ||
        penaltyKicks !== undefined ||
        forfeitWinnerTeamId !== undefined;
      if (touchesTheMatch) {
        return NextResponse.json({ error: words.fixtureHasNoEntrants }, { status: 400 });
      }
      const scheduled = await prisma.match.update({
        where: { id: matchId },
        data: updateData,
        include: MATCH_INCLUDE,
      });
      return NextResponse.json({ match: scheduled });
    }

    const homeName = standing.first?.name ?? words.entrantNotSetYet;
    const awayName = standing.second?.name ?? words.entrantNotSetYet;

    let parsedHomeGoals: GoalInput[] = [];
    let parsedAwayGoals: GoalInput[] = [];
    let eventGoals: GoalEvent[] = [];
    let eventKicks: KickEvent[] = [];
    const eventsMode = goalEvents !== undefined;
    const enteringResult = !eventsMode && (homeScore !== undefined || awayScore !== undefined);
    let clearedResult = false;

    const resultArriving =
      eventsMode || (enteringResult && parseScorePair(homeScore, awayScore) !== null);
    if (resultArriving && !isFootball(shape)) {
      return NextResponse.json({ error: tournament.seriesResultNotReady }, { status: 400 });
    }

    if (eventsMode) {
      const evGoals = validateGoalEvents(goalEvents, sides.first, sides.second);
      if (evGoals === null) {
        return NextResponse.json({ error: tournament.goalEventsInvalid }, { status: 400 });
      }
      const evKicks = validateKicks(penaltyKicks, sides.first, sides.second);
      if (evKicks === null) {
        return NextResponse.json({ error: tournament.kicksInvalid }, { status: 400 });
      }

      const eventAccounts = [...evGoals, ...evKicks]
        .map((e) => e.userId)
        .filter((id): id is string => id !== null);
      const rosterRows = await prisma.teamMember.findMany({
        where: {
          userId: { in: eventAccounts },
          teamId: { in: [sides.first, sides.second] },
        },
        select: { userId: true, teamId: true },
      });
      const teamsOf = new Map<string, Set<string>>();
      for (const r of rosterRows) {
        if (!teamsOf.has(r.userId)) teamsOf.set(r.userId, new Set());
        teamsOf.get(r.userId)!.add(r.teamId);
      }
      const other = (teamId: string) => (teamId === sides.first ? sides.second : sides.first);
      for (const g of evGoals) {
        if (g.userId === null) continue;
        const expected = g.kind === "OWN_GOAL" ? other(g.teamId) : g.teamId;
        if (!teamsOf.get(g.userId)?.has(expected)) {
          return NextResponse.json(
            {
              error:
                g.kind === "OWN_GOAL"
                  ? tournament.ownGoalScorerWrongTeam
                  : tournament.scorerWrongTeam,
            },
            { status: 400 },
          );
        }
      }
      for (const k of evKicks) {
        if (k.userId !== null && !teamsOf.get(k.userId)?.has(k.teamId)) {
          return NextResponse.json({ error: tournament.kickerWrongTeam }, { status: 400 });
        }
      }

      const played = playedScore(evGoals, sides.first);
      const winner =
        forfeitWinnerTeamId === undefined ? match.forfeitWinnerTeamId : forfeitWinnerTeamId;
      const score = winner ? forfeitScore(played, winner, sides.first) : played;
      updateData.homeScore = score.home;
      updateData.awayScore = score.away;
      updateData.status = "PLAYED";

      const effectiveKnockout = updateData.isKnockout ?? match.isKnockout;
      if (hasExtraTime(evGoals)) {
        if (!effectiveKnockout) {
          return NextResponse.json({ error: tournament.extraTimeKnockoutOnly }, { status: 400 });
        }
        if (!extraTimeAllowed(effectiveKnockout, evGoals, sides.first)) {
          return NextResponse.json({ error: tournament.extraTimeTieOnly }, { status: 400 });
        }
      }
      if (evKicks.length > 0) {
        if (!effectiveKnockout) {
          return NextResponse.json({ error: tournament.penaltiesKnockoutOnly }, { status: 400 });
        }
        if (!kicksAllowed(effectiveKnockout, evGoals, sides.first)) {
          return NextResponse.json({ error: tournament.penaltiesTieOnly }, { status: 400 });
        }
        if (!kicksAlternate(evKicks)) {
          return NextResponse.json({ error: tournament.kicksNotAlternating }, { status: 400 });
        }
        const shootout = shootoutFromKicks(evKicks, sides.first);
        if (shootout.home === shootout.away) {
          return NextResponse.json({ error: tournament.penaltiesTied }, { status: 400 });
        }
        updateData.homePenalties = shootout.home;
        updateData.awayPenalties = shootout.away;
      } else {
        updateData.homePenalties = null;
        updateData.awayPenalties = null;
      }
      eventGoals = evGoals;
      eventKicks = evKicks;
    }

    if (enteringResult) {
      const scores = parseScorePair(homeScore, awayScore);
      if (scores === "invalid") {
        return NextResponse.json({ error: tournament.resultNotNumber }, { status: 400 });
      }
      if (scores === null) {
        updateData.homeScore = null;
        updateData.awayScore = null;
        updateData.homePenalties = null;
        updateData.awayPenalties = null;
        updateData.status = "SCHEDULED";
        clearedResult = true;
      } else {
        const hs = scores.home;
        const as = scores.away;

        const hg = validateGoals(homeGoals);
        const ag = validateGoals(awayGoals);
        if (hg === null || ag === null) {
          return NextResponse.json({ error: tournament.scorersInvalid }, { status: 400 });
        }
        if (hg.length > 0 && hg.reduce((s, g) => s + g.count, 0) !== hs) {
          return NextResponse.json({ error: tournament.homeGoalsMismatch }, { status: 400 });
        }
        if (ag.length > 0 && ag.reduce((s, g) => s + g.count, 0) !== as) {
          return NextResponse.json({ error: tournament.awayGoalsMismatch }, { status: 400 });
        }

        if (hg.length > 0 || ag.length > 0) {
          const squad = await prisma.teamMember.findMany({
            where: {
              userId: { in: [...hg, ...ag].map((g) => g.userId) },
              teamId: { in: [sides.first, sides.second] },
            },
            select: { userId: true, teamId: true },
          });
          const teamOf = new Map(squad.map((m) => [m.userId, m.teamId]));
          const teamOfScorer = (id: string) => teamOf.get(id);
          for (const g of hg) {
            if (teamOfScorer(g.userId) !== sides.first) {
              return NextResponse.json({ error: tournament.scorerNotInHome }, { status: 400 });
            }
          }
          for (const g of ag) {
            if (teamOfScorer(g.userId) !== sides.second) {
              return NextResponse.json({ error: tournament.scorerNotInAway }, { status: 400 });
            }
          }
        }

        updateData.homeScore = hs;
        updateData.awayScore = as;
        updateData.status = "PLAYED";
        parsedHomeGoals = hg;
        parsedAwayGoals = ag;
      }
    }

    if (homePenalties !== undefined || awayPenalties !== undefined) {
      const penalties = parseScorePair(homePenalties, awayPenalties);
      if (penalties === "invalid") {
        return NextResponse.json({ error: tournament.penaltiesNotNumber }, { status: 400 });
      }
      if (penalties === null) {
        updateData.homePenalties = null;
        updateData.awayPenalties = null;
      } else {
        const hp = penalties.home;
        const ap = penalties.away;
        if (hp === ap) {
          return NextResponse.json({ error: tournament.penaltiesTied }, { status: 400 });
        }
        const effectiveKnockout = updateData.isKnockout ?? match.isKnockout;
        const effectiveHome =
          updateData.homeScore !== undefined ? updateData.homeScore : match.homeScore;
        const effectiveAway =
          updateData.awayScore !== undefined ? updateData.awayScore : match.awayScore;
        if (!effectiveKnockout) {
          return NextResponse.json({ error: tournament.penaltiesKnockoutOnly }, { status: 400 });
        }
        if (effectiveHome === null || effectiveAway === null || effectiveHome !== effectiveAway) {
          return NextResponse.json({ error: tournament.penaltiesTieOnly }, { status: 400 });
        }
        updateData.homePenalties = hp;
        updateData.awayPenalties = ap;
      }
    }

    if (forfeitWinnerTeamId !== undefined) {
      if (forfeitWinnerTeamId === null) {
        updateData.forfeitWinnerTeamId = null;
      } else if (forfeitWinnerTeamId !== sides.first && forfeitWinnerTeamId !== sides.second) {
        return NextResponse.json({ error: words.forfeitWinnerNotInMatch }, { status: 400 });
      } else {
        updateData.forfeitWinnerTeamId = forfeitWinnerTeamId;
      }
      if (!eventsMode && match.status === "PLAYED") {
        const stored = await prisma.matchGoal.findMany({
          where: { matchId },
          select: { teamId: true },
        });
        const scored = scoreFromGoals(stored, sides.first);
        const score = forfeitWinnerTeamId
          ? forfeitScore(scored, forfeitWinnerTeamId, sides.first)
          : scored;
        updateData.homeScore = score.home;
        updateData.awayScore = score.away;
      }
    }

    if (manOfTheMatchId !== undefined) {
      if (manOfTheMatchId === null) {
        updateData.manOfTheMatchUserId = null;
      } else if (!isFootball(match.activity.matchShape)) {
        return NextResponse.json({ error: tournament.motmFootballOnly }, { status: 400 });
      } else {
        const inRoster = await prisma.teamMember.findFirst({
          where: {
            userId: manOfTheMatchId,
            teamId: { in: [sides.first, sides.second] },
          },
        });
        if (!inRoster) {
          return NextResponse.json({ error: tournament.motmNotInMatch }, { status: 400 });
        }
        updateData.manOfTheMatchUserId = manOfTheMatchId;
      }
    }

    if (updateData.status === "PLAYED" && !wasPlayed) {
      const kickoff = updateData.matchDate !== undefined ? updateData.matchDate : match.matchDate;
      if (!kickoffPassed(kickoff, new Date())) {
        return NextResponse.json({ error: tournament.resultBeforeKickoff }, { status: 400 });
      }
    }

    const involvedAccounts = [
      ...parsedHomeGoals.map((g) => g.userId),
      ...parsedAwayGoals.map((g) => g.userId),
      ...[...eventGoals, ...eventKicks]
        .map((e) => e.userId)
        .filter((id): id is string => id !== null),
    ];

    if (enteringResult || eventsMode) {
      const suspended = await suspendedUserIds(match.activityId);
      const involved = [
        ...involvedAccounts,
        ...(updateData.manOfTheMatchUserId ? [updateData.manOfTheMatchUserId] : []),
      ];
      if (involved.some((userId) => suspended.has(userId))) {
        return NextResponse.json({ error: tournament.memberSuspended }, { status: 409 });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (eventsMode) {
        await tx.matchGoal.deleteMany({ where: { matchId } });
        if (eventGoals.length > 0) {
          await tx.matchGoal.createMany({
            data: eventGoals.map((g) => ({
              matchId,
              userId: g.userId,
              teamId: g.teamId,
              kind: g.kind,
              period: g.period,
              minute: g.minute,
            })),
          });
        }
        await tx.matchPenaltyKick.deleteMany({ where: { matchId } });
        if (eventKicks.length > 0) {
          await tx.matchPenaltyKick.createMany({
            data: eventKicks.map((k, i) => ({
              matchId,
              teamId: k.teamId,
              userId: k.userId,
              order: i + 1,
              scored: k.scored,
            })),
          });
        }
      }
      if (enteringResult) {
        await tx.matchGoal.deleteMany({ where: { matchId } });
        if (clearedResult) {
          await tx.matchPenaltyKick.deleteMany({ where: { matchId } });
        }
        if (parsedHomeGoals.length > 0) {
          await tx.matchGoal.createMany({
            data: parsedHomeGoals.map((g) => ({
              matchId,
              userId: g.userId,
              teamId: sides.first,
              count: g.count,
              minute: g.minute,
            })),
          });
        }
        if (parsedAwayGoals.length > 0) {
          await tx.matchGoal.createMany({
            data: parsedAwayGoals.map((g) => ({
              matchId,
              userId: g.userId,
              teamId: sides.second,
              count: g.count,
              minute: g.minute,
            })),
          });
        }
      }
      if (
        (enteringResult || eventsMode) &&
        updateData.status === "PLAYED" &&
        !match.suspensionsServedAt
      ) {
        await serveMatch(tx, match.activityId, [sides.first, sides.second]);
        updateData.suspensionsServedAt = new Date();
      }
      return tx.match.update({ where: { id: matchId }, data: updateData, include: MATCH_INCLUDE });
    });

    if (forfeitWinnerTeamId !== undefined) {
      const winnerName = forfeitWinnerTeamId === sides.first ? homeName : awayName;
      await logAction(
        session.username,
        forfeitWinnerTeamId ? "SET_MATCH_FORFEIT" : "CLEAR_MATCH_FORFEIT",
        `${homeName} × ${awayName}${forfeitWinnerTeamId ? ` — ${winnerName}` : ""}`,
        {
          ...auditContext(session, req),
          targetType: "Match",
          targetId: matchId,
          before: {
            forfeitWinnerTeamId: match.forfeitWinnerTeamId,
            homeScore: match.homeScore,
            awayScore: match.awayScore,
          },
          after: {
            forfeitWinnerTeamId,
            homeScore: updateData.homeScore,
            awayScore: updateData.awayScore,
          },
        },
      );
    }

    if ((enteringResult || eventsMode) && updateData.status === "PLAYED") {
      await logAction(
        session.username,
        "ENTER_MATCH_RESULT",
        `${homeName} ${updateData.homeScore}-${updateData.awayScore} ${awayName}`,
        {
          ...auditContext(session, req),
          targetType: "Match",
          targetId: matchId,
          before: { homeScore: match.homeScore, awayScore: match.awayScore, status: match.status },
          after: {
            homeScore: updateData.homeScore,
            awayScore: updateData.awayScore,
            status: updateData.status,
          },
        },
      );
      if (!wasPlayed) {
        notifyTeams(
          sides.first,
          sides.second,
          notify.matchResult(
            homeName,
            updateData.homeScore!,
            updateData.awayScore!,
            awayName,
            match.activityId,
            entrant,
          ),
        ).catch((err) => logger.error("match.result.push.error", err));
      }
    }

    return NextResponse.json({ match: updated });
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/matches/[matchId]",
  async (req: NextRequest, { params }: { params: Promise<{ matchId: string }> }) => {
    const { matchId } = await params;
    const session = await requireMatchAccess(matchId);

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: { select: { name: true } },
        awayTeam: { select: { name: true } },
        sideATeam: { select: { name: true } },
        sideBTeam: { select: { name: true } },
        activity: { select: { matchShape: true } },
      },
    });
    if (!match) {
      return NextResponse.json({ error: tournament.matchNotFound }, { status: 404 });
    }

    const words = entrantWording(await entrantOfMatch(prisma, matchId));
    const played = matchSideTeams(match, match.activity.matchShape);
    const homeName = played.first?.name ?? words.entrantNotSetYet;
    const awayName = played.second?.name ?? words.entrantNotSetYet;

    await prisma.match.delete({ where: { id: matchId } });
    await logAction(session.username, "DELETE_MATCH", `${homeName} × ${awayName}`, {
      ...auditContext(session, req),
      targetType: "Match",
      targetId: matchId,
      before: {
        homeTeam: homeName,
        awayTeam: awayName,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        status: match.status,
        matchDate: match.matchDate,
      },
    });

    return NextResponse.json({ ok: true });
  },
);
