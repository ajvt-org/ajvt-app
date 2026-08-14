import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { notifyTeams } from "@/lib/tournamentNotify";
import { withRoute } from "@/lib/route";
import { logger } from "@/lib/logger";
import { parse } from "@/lib/validation";
import { mvpVoteCreateSchema, mvpVoteStatusSchema } from "./schema";

const VOTE_INCLUDE = {
  candidates: {
    select: {
      id: true,
      memberId: true,
      member: { select: { id: true, fullName: true } },
      _count: { select: { votes: true } },
    },
  },
} as const;

export const POST = withRoute(
  "POST /api/admin/matches/[matchId]/mvp-vote",
  async (req: NextRequest, { params }: { params: Promise<{ matchId: string }> }) => {
    const session = await requireAdminRole("ACTIVITIES");
    const { matchId } = await params;
    const { candidateMemberIds } = parse(mvpVoteCreateSchema, await req.json());

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } },
        mvpVote: { select: { id: true } },
      },
    });
    if (!match) {
      return NextResponse.json({ error: "المباراة غير موجودة" }, { status: 404 });
    }
    if (match.mvpVote) {
      return NextResponse.json(
        { error: "يوجد تصويت لهذه المباراة بالفعل — احذفه أولاً لإعادة الإنشاء" },
        { status: 409 },
      );
    }

    const rosterEntries = await prisma.teamMember.findMany({
      where: {
        memberId: { in: candidateMemberIds },
        teamId: { in: [match.homeTeamId, match.awayTeamId] },
      },
      select: { memberId: true },
    });
    if (rosterEntries.length !== candidateMemberIds.length) {
      return NextResponse.json(
        { error: "كل المرشحين يجب أن ينتموا إلى أحد الفريقين المتنافسين" },
        { status: 400 },
      );
    }

    const vote = await prisma.matchMvpVote.create({
      data: {
        matchId,
        candidates: { create: candidateMemberIds.map((memberId) => ({ memberId })) },
      },
      include: VOTE_INCLUDE,
    });

    await logAction(
      session.username,
      "OPEN_MVP_VOTE",
      `${match.homeTeam.name} × ${match.awayTeam.name}`,
    );

    notifyTeams(match.homeTeamId, match.awayTeamId, {
      title: "رابطة شباب التاكلالت",
      body: `🌟 صوّت الآن لأفضل لاعب في مباراة ${match.homeTeam.name} × ${match.awayTeam.name}`,
      url: `/tournament/${match.activityId}`,
    }).catch((err) => logger.error("mvp.vote.open.push.error", err));

    return NextResponse.json({ vote }, { status: 201 });
  },
);

export const PATCH = withRoute(
  "PATCH /api/admin/matches/[matchId]/mvp-vote",
  async (req: NextRequest, { params }: { params: Promise<{ matchId: string }> }) => {
    const session = await requireAdminRole("ACTIVITIES");
    const { matchId } = await params;
    const { status } = parse(mvpVoteStatusSchema, await req.json());

    const existing = await prisma.matchMvpVote.findUnique({ where: { matchId } });
    if (!existing) {
      return NextResponse.json({ error: "لا يوجد تصويت لهذه المباراة" }, { status: 404 });
    }

    const vote = await prisma.matchMvpVote.update({
      where: { matchId },
      data: { status, closedAt: status === "CLOSED" ? new Date() : null },
      include: VOTE_INCLUDE,
    });

    await logAction(
      session.username,
      status === "CLOSED" ? "CLOSE_MVP_VOTE" : "REOPEN_MVP_VOTE",
      matchId,
    );

    return NextResponse.json({ vote });
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/matches/[matchId]/mvp-vote",
  async (_req: NextRequest, { params }: { params: Promise<{ matchId: string }> }) => {
    const session = await requireAdminRole("ACTIVITIES");
    const { matchId } = await params;

    const existing = await prisma.matchMvpVote.findUnique({ where: { matchId } });
    if (!existing) {
      return NextResponse.json({ error: "لا يوجد تصويت لهذه المباراة" }, { status: 404 });
    }

    await prisma.matchMvpVote.delete({ where: { matchId } });
    await logAction(session.username, "DELETE_MVP_VOTE", matchId);

    return NextResponse.json({ ok: true });
  },
);
