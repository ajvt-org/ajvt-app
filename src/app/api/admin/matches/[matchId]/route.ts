import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMatchAccess } from "@/lib/activityAccessServer";
import { logAction, auditContext } from "@/lib/audit";
import { notifyTeams } from "@/lib/tournamentNotify";
import { serveMatch, suspendedMemberIds } from "@/lib/suspensionServer";
import { parseMatchDate, isValidLeaguePairing } from "@/lib/tournament";
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
import { parse } from "@/lib/validation";
import { matchUpdateSchema } from "./schema";
import type { MatchStatus } from "@prisma/client";
import { notify, tournament } from "@/lib/messages";

const MATCH_INCLUDE = {
  homeTeam: { select: { id: true, name: true, logo: true } },
  awayTeam: { select: { id: true, name: true, logo: true } },
  manOfTheMatch: { select: { id: true, fullName: true, photo: true } },
  goals: {
    select: {
      id: true,
      count: true,
      minute: true,
      teamId: true,
      kind: true,
      period: true,
      member: { select: { id: true, fullName: true, photo: true } },
    },
  },
  penaltyKicks: {
    orderBy: { order: "asc" },
    select: {
      id: true,
      teamId: true,
      order: true,
      scored: true,
      member: { select: { id: true, fullName: true, photo: true } },
    },
  },
  bookings: {
    select: {
      id: true,
      cardType: true,
      minute: true,
      teamId: true,
      member: { select: { id: true, fullName: true, photo: true } },
    },
  },
  mvpVote: {
    select: {
      id: true,
      status: true,
      candidates: {
        select: {
          id: true,
          memberId: true,
          member: { select: { id: true, fullName: true } },
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
      homeTeamId,
      awayTeamId,
      goalEvents,
      penaltyKicks,
    } = parse(matchUpdateSchema, await req.json());

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: { select: { id: true, name: true, groupId: true } },
        awayTeam: { select: { id: true, name: true, groupId: true } },
      },
    });
    if (!match) {
      return NextResponse.json({ error: tournament.matchNotFound }, { status: 404 });
    }
    const wasPlayed = match.status === "PLAYED";
    let finalHomeGroupId = match.homeTeam.groupId;
    let finalAwayGroupId = match.awayTeam.groupId;

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
      manOfTheMatchId?: string | null;
      status?: MatchStatus;
      homeTeamId?: string;
      awayTeamId?: string;
    } = {};

    if (homeTeamId !== undefined || awayTeamId !== undefined) {
      const newHome = homeTeamId !== undefined ? homeTeamId : match.homeTeamId;
      const newAway = awayTeamId !== undefined ? awayTeamId : match.awayTeamId;
      if (newHome === newAway) {
        return NextResponse.json({ error: tournament.teamAgainstItself }, { status: 400 });
      }
      const validTeams = await prisma.team.findMany({
        where: { id: { in: [newHome, newAway] }, activityId: match.activityId },
        select: { id: true, groupId: true },
      });
      if (validTeams.length !== 2) {
        return NextResponse.json({ error: tournament.teamsNotInTournament }, { status: 400 });
      }
      updateData.homeTeamId = newHome;
      updateData.awayTeamId = newAway;
      finalHomeGroupId = validTeams.find((t) => t.id === newHome)!.groupId;
      finalAwayGroupId = validTeams.find((t) => t.id === newAway)!.groupId;
    }

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
    if (!isValidLeaguePairing(finalIsKnockout, finalHomeGroupId, finalAwayGroupId)) {
      return NextResponse.json({ error: tournament.leaguePairing }, { status: 400 });
    }
    if (order !== undefined) {
      updateData.order = Number(order);
    }

    let parsedHomeGoals: GoalInput[] = [];
    let parsedAwayGoals: GoalInput[] = [];
    let eventGoals: GoalEvent[] = [];
    let eventKicks: KickEvent[] = [];
    const eventsMode = goalEvents !== undefined;
    const enteringResult = !eventsMode && (homeScore !== undefined || awayScore !== undefined);

    if (eventsMode) {
      const evGoals = validateGoalEvents(goalEvents, match.homeTeamId, match.awayTeamId);
      if (evGoals === null) {
        return NextResponse.json({ error: tournament.goalEventsInvalid }, { status: 400 });
      }
      const evKicks = validateKicks(penaltyKicks, match.homeTeamId, match.awayTeamId);
      if (evKicks === null) {
        return NextResponse.json({ error: tournament.kicksInvalid }, { status: 400 });
      }

      const memberIds = [...evGoals, ...evKicks]
        .map((e) => e.memberId)
        .filter((id): id is string => id !== null);
      const rosterRows = await prisma.teamMember.findMany({
        where: {
          memberId: { in: memberIds },
          teamId: { in: [match.homeTeamId, match.awayTeamId] },
        },
        select: { memberId: true, teamId: true },
      });
      const teamsOf = new Map<string, Set<string>>();
      for (const r of rosterRows) {
        if (!teamsOf.has(r.memberId)) teamsOf.set(r.memberId, new Set());
        teamsOf.get(r.memberId)!.add(r.teamId);
      }
      const other = (teamId: string) =>
        teamId === match.homeTeamId ? match.awayTeamId : match.homeTeamId;
      for (const g of evGoals) {
        if (g.memberId === null) continue;
        const expected = g.kind === "OWN_GOAL" ? other(g.teamId) : g.teamId;
        if (!teamsOf.get(g.memberId)?.has(expected)) {
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
        if (k.memberId !== null && !teamsOf.get(k.memberId)?.has(k.teamId)) {
          return NextResponse.json({ error: tournament.kickerWrongTeam }, { status: 400 });
        }
      }

      const score = scoreFromGoals(evGoals, match.homeTeamId);
      updateData.homeScore = score.home;
      updateData.awayScore = score.away;
      updateData.status = "PLAYED";

      const effectiveKnockout = updateData.isKnockout ?? match.isKnockout;
      if (evKicks.length > 0) {
        if (!effectiveKnockout) {
          return NextResponse.json({ error: tournament.penaltiesKnockoutOnly }, { status: 400 });
        }
        if (score.home !== score.away) {
          return NextResponse.json({ error: tournament.penaltiesTieOnly }, { status: 400 });
        }
        const shootout = shootoutFromKicks(evKicks, match.homeTeamId);
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
        updateData.status = "SCHEDULED";
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
          const memberIds = [...hg, ...ag].map((g) => g.memberId);
          const validMembers = await prisma.teamMember.findMany({
            where: {
              memberId: { in: memberIds },
              teamId: { in: [match.homeTeamId, match.awayTeamId] },
            },
            select: { memberId: true, teamId: true },
          });
          const memberTeam = new Map(validMembers.map((m) => [m.memberId, m.teamId]));
          for (const g of hg) {
            if (memberTeam.get(g.memberId) !== match.homeTeamId) {
              return NextResponse.json({ error: tournament.scorerNotInHome }, { status: 400 });
            }
          }
          for (const g of ag) {
            if (memberTeam.get(g.memberId) !== match.awayTeamId) {
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

    if (manOfTheMatchId !== undefined) {
      if (manOfTheMatchId === null) {
        updateData.manOfTheMatchId = null;
      } else {
        const inRoster = await prisma.teamMember.findFirst({
          where: {
            memberId: manOfTheMatchId,
            teamId: { in: [match.homeTeamId, match.awayTeamId] },
          },
        });
        if (!inRoster) {
          return NextResponse.json({ error: tournament.motmNotInMatch }, { status: 400 });
        }
        updateData.manOfTheMatchId = manOfTheMatchId;
      }
    }

    if (enteringResult || eventsMode) {
      const suspended = await suspendedMemberIds(match.activityId);
      const involved = [
        ...parsedHomeGoals.map((g) => g.memberId),
        ...parsedAwayGoals.map((g) => g.memberId),
        ...[...eventGoals, ...eventKicks]
          .map((e) => e.memberId)
          .filter((id): id is string => id !== null),
        ...(updateData.manOfTheMatchId ? [updateData.manOfTheMatchId] : []),
      ];
      if (involved.some((memberId) => suspended.has(memberId))) {
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
              memberId: g.memberId,
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
              memberId: k.memberId,
              order: i + 1,
              scored: k.scored,
            })),
          });
        }
      }
      if (enteringResult) {
        await tx.matchGoal.deleteMany({ where: { matchId } });
        if (parsedHomeGoals.length > 0) {
          await tx.matchGoal.createMany({
            data: parsedHomeGoals.map((g) => ({
              matchId,
              memberId: g.memberId,
              teamId: match.homeTeamId,
              count: g.count,
              minute: g.minute,
            })),
          });
        }
        if (parsedAwayGoals.length > 0) {
          await tx.matchGoal.createMany({
            data: parsedAwayGoals.map((g) => ({
              matchId,
              memberId: g.memberId,
              teamId: match.awayTeamId,
              count: g.count,
              minute: g.minute,
            })),
          });
        }
      }
      if ((enteringResult || eventsMode) && updateData.status === "PLAYED" && !wasPlayed) {
        await serveMatch(tx, match.activityId, [match.homeTeamId, match.awayTeamId]);
      }
      return tx.match.update({ where: { id: matchId }, data: updateData, include: MATCH_INCLUDE });
    });

    if ((enteringResult || eventsMode) && updateData.status === "PLAYED") {
      await logAction(
        session.username,
        "ENTER_MATCH_RESULT",
        `${match.homeTeam.name} ${updateData.homeScore}-${updateData.awayScore} ${match.awayTeam.name}`,
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
          match.homeTeamId,
          match.awayTeamId,
          notify.matchResult(
            match.homeTeam.name,
            updateData.homeScore!,
            updateData.awayScore!,
            match.awayTeam.name,
            match.activityId,
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
      include: { homeTeam: { select: { name: true } }, awayTeam: { select: { name: true } } },
    });
    if (!match) {
      return NextResponse.json({ error: tournament.matchNotFound }, { status: 404 });
    }

    await prisma.match.delete({ where: { id: matchId } });
    await logAction(
      session.username,
      "DELETE_MATCH",
      `${match.homeTeam.name} × ${match.awayTeam.name}`,
      {
        ...auditContext(session, req),
        targetType: "Match",
        targetId: matchId,
        before: {
          homeTeam: match.homeTeam.name,
          awayTeam: match.awayTeam.name,
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          status: match.status,
          matchDate: match.matchDate,
        },
      },
    );

    return NextResponse.json({ ok: true });
  },
);
