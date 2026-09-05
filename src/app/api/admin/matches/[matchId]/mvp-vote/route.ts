import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMatchAccess } from "@/lib/activityAccessServer";
import { logAction } from "@/lib/audit";
import { notifyTeams } from "@/lib/tournamentNotify";
import { withRoute } from "@/lib/route";
import { logger } from "@/lib/logger";
import { parse } from "@/lib/validation";
import { mvpVoteCreateSchema, mvpVoteStatusSchema } from "./schema";
import { notify, tournament } from "@/lib/messages";
import { closesAtFrom } from "@/lib/mvpVote";
import { isFootball } from "@/lib/matchShape";

const VOTE_INCLUDE = {
  candidates: {
    select: {
      id: true,
      userId: true,
      user: { select: { fullName: true } },
      _count: { select: { votes: true } },
    },
  },
} as const;

export const POST = withRoute(
  "POST /api/admin/matches/[matchId]/mvp-vote",
  async (req: NextRequest, { params }: { params: Promise<{ matchId: string }> }) => {
    const { matchId } = await params;
    const session = await requireMatchAccess(matchId);
    const { candidateMemberIds, minutes } = parse(mvpVoteCreateSchema, await req.json());

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } },
        mvpVote: { select: { id: true } },
        activity: { select: { mvpVoteMinutes: true, matchShape: true } },
      },
    });
    if (!match) {
      return NextResponse.json({ error: tournament.matchNotFound }, { status: 404 });
    }
    if (!isFootball(match.activity.matchShape)) {
      return NextResponse.json({ error: tournament.motmFootballOnly }, { status: 400 });
    }
    if (match.homeTeam === null || match.awayTeam === null) {
      return NextResponse.json({ error: tournament.fixtureHasNoTeams }, { status: 400 });
    }
    if (match.status !== "PLAYED") {
      return NextResponse.json({ error: tournament.voteNeedsResult }, { status: 400 });
    }
    if (match.mvpVote) {
      return NextResponse.json({ error: tournament.mvpVoteExists }, { status: 409 });
    }

    const candidates = await prisma.user.findMany({
      where: { id: { in: candidateMemberIds } },
      select: { id: true },
    });

    const rosterEntries = await prisma.teamMember.findMany({
      where: {
        userId: { in: candidates.map((m) => m.id) },
        teamId: { in: [match.homeTeam.id, match.awayTeam.id] },
      },
      select: { userId: true },
    });
    if (rosterEntries.length !== candidateMemberIds.length) {
      return NextResponse.json({ error: tournament.mvpCandidateOutsideMatch }, { status: 400 });
    }

    const vote = await prisma.matchMvpVote.create({
      data: {
        matchId,
        closesAt: closesAtFrom(new Date(), minutes ?? match.activity.mvpVoteMinutes),
        candidates: {
          create: candidates.map((m) => ({ userId: m.id })),
        },
      },
      include: VOTE_INCLUDE,
    });

    await logAction(
      session.username,
      "OPEN_MVP_VOTE",
      `${match.homeTeam.name} × ${match.awayTeam.name}`,
    );

    notifyTeams(
      match.homeTeam.id,
      match.awayTeam.id,
      notify.mvpVoteOpen(match.homeTeam.name, match.awayTeam.name, match.activityId),
    ).catch((err) => logger.error("mvp.vote.open.push.error", err));

    return NextResponse.json({ vote }, { status: 201 });
  },
);

export const PATCH = withRoute(
  "PATCH /api/admin/matches/[matchId]/mvp-vote",
  async (req: NextRequest, { params }: { params: Promise<{ matchId: string }> }) => {
    const { matchId } = await params;
    const session = await requireMatchAccess(matchId);
    const { status, minutes } = parse(mvpVoteStatusSchema, await req.json());
    if (status === undefined && minutes === undefined) {
      return NextResponse.json({ error: tournament.voteNothingToChange }, { status: 400 });
    }

    const existing = await prisma.matchMvpVote.findUnique({
      where: { matchId },
      select: { id: true, match: { select: { activity: { select: { mvpVoteMinutes: true } } } } },
    });
    if (!existing) {
      return NextResponse.json({ error: tournament.noVoteForMatch }, { status: 404 });
    }

    const now = new Date();
    const reopening = status === "OPEN";
    const window =
      minutes !== undefined ? minutes : reopening ? existing.match.activity.mvpVoteMinutes : null;

    const vote = await prisma.matchMvpVote.update({
      where: { matchId },
      data: {
        ...(status ? { status, closedAt: status === "CLOSED" ? now : null } : {}),
        ...(window !== null ? { closesAt: closesAtFrom(now, window) } : {}),
      },
      include: VOTE_INCLUDE,
    });

    await logAction(
      session.username,
      status === "CLOSED"
        ? "CLOSE_MVP_VOTE"
        : status === "OPEN"
          ? "REOPEN_MVP_VOTE"
          : "EXTEND_MVP_VOTE",
      matchId,
    );

    return NextResponse.json({ vote });
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/matches/[matchId]/mvp-vote",
  async (_req: NextRequest, { params }: { params: Promise<{ matchId: string }> }) => {
    const { matchId } = await params;
    const session = await requireMatchAccess(matchId);

    const existing = await prisma.matchMvpVote.findUnique({ where: { matchId } });
    if (!existing) {
      return NextResponse.json({ error: tournament.noVoteForMatch }, { status: 404 });
    }

    await prisma.matchMvpVote.delete({ where: { matchId } });
    await logAction(session.username, "DELETE_MVP_VOTE", matchId);

    return NextResponse.json({ ok: true });
  },
);
