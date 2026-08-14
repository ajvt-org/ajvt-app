import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { notifyTeams } from "@/lib/tournamentNotify";
import { withRoute } from "@/lib/route";
import { logger } from "@/lib/logger";

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
    const { candidateMemberIds } = await req.json();

    if (
      !Array.isArray(candidateMemberIds) ||
      candidateMemberIds.length < 2 ||
      candidateMemberIds.length > 6
    ) {
      return NextResponse.json({ error: "يجب اختيار بين 2 و6 لاعبين مرشحين" }, { status: 400 });
    }
    const uniqueIds = Array.from(new Set(candidateMemberIds));
    if (uniqueIds.length !== candidateMemberIds.length) {
      return NextResponse.json({ error: "لا يمكن اختيار نفس اللاعب مرتين" }, { status: 400 });
    }

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
        memberId: { in: uniqueIds as string[] },
        teamId: { in: [match.homeTeamId, match.awayTeamId] },
      },
      select: { memberId: true },
    });
    if (rosterEntries.length !== uniqueIds.length) {
      return NextResponse.json(
        { error: "كل المرشحين يجب أن ينتموا إلى أحد الفريقين المتنافسين" },
        { status: 400 },
      );
    }

    const vote = await prisma.matchMvpVote.create({
      data: {
        matchId,
        candidates: { create: uniqueIds.map((memberId) => ({ memberId: memberId as string })) },
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
    const { status } = await req.json();

    if (!["OPEN", "CLOSED"].includes(status)) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }

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
