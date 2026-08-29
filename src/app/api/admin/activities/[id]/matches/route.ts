import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { settleMvpVotes } from "@/lib/mvpVoteServer";
import { DEFAULT_MVP_VOTE_MINUTES } from "@/lib/mvpVote";
import { requireActivityAccess } from "@/lib/activityAccessServer";
import { logAction, auditContext } from "@/lib/audit";
import { notifyTeams } from "@/lib/tournamentNotify";
import { isValidLeaguePairing } from "@/lib/tournament";
import { parseMatchDate } from "@/lib/clubTime";
import { withRoute } from "@/lib/route";
import { logger } from "@/lib/logger";
import { notify, tournament } from "@/lib/messages";

const MATCH_INCLUDE = {
  homeTeam: { select: { id: true, name: true, logo: true } },
  awayTeam: { select: { id: true, name: true, logo: true } },
  manOfTheMatch: { select: { id: true, user: { select: { fullName: true, photo: true } } } },
  goals: {
    orderBy: { minute: "asc" },
    select: {
      id: true,
      count: true,
      minute: true,
      teamId: true,
      kind: true,
      period: true,
      member: { select: { id: true, user: { select: { fullName: true, photo: true } } } },
    },
  },
  penaltyKicks: {
    orderBy: { order: "asc" },
    select: {
      id: true,
      teamId: true,
      order: true,
      scored: true,
      member: { select: { id: true, user: { select: { fullName: true, photo: true } } } },
    },
  },
  bookings: {
    orderBy: { minute: "asc" },
    select: {
      id: true,
      cardType: true,
      minute: true,
      teamId: true,
      member: { select: { id: true, user: { select: { fullName: true, photo: true } } } },
    },
  },
  mvpVote: {
    select: {
      id: true,
      status: true,
      closesAt: true,
      candidates: {
        select: {
          id: true,
          memberId: true,
          member: { select: { id: true, user: { select: { fullName: true } } } },
          _count: { select: { votes: true } },
        },
      },
    },
  },
} as const;

export const GET = withRoute(
  "GET /api/admin/activities/[id]/matches",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    await requireActivityAccess(id);

    const read = () =>
      prisma.match.findMany({
        where: { activityId: id },
        orderBy: [{ status: "asc" }, { order: "asc" }, { createdAt: "asc" }],
        include: MATCH_INCLUDE,
      });

    const [matches, activity] = await Promise.all([
      read(),
      prisma.activity.findUnique({ where: { id }, select: { mvpVoteMinutes: true } }),
    ]);
    const applied = await settleMvpVotes(matches);

    return NextResponse.json({
      matches: applied.size > 0 ? await read() : matches,
      mvpVoteMinutes: activity?.mvpVoteMinutes ?? DEFAULT_MVP_VOTE_MINUTES,
    });
  },
);

export const POST = withRoute(
  "POST /api/admin/activities/[id]/matches",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const session = await requireActivityAccess(id);
    const { homeTeamId, awayTeamId, matchDate, round, venue, isKnockout } = await req.json();

    if (!homeTeamId || !awayTeamId) {
      return NextResponse.json({ error: "يجب اختيار الفريقين" }, { status: 400 });
    }
    if (homeTeamId === awayTeamId) {
      return NextResponse.json({ error: tournament.teamAgainstItself }, { status: 400 });
    }

    const teams = await prisma.team.findMany({
      where: { id: { in: [homeTeamId, awayTeamId] }, activityId: id },
      select: { id: true, name: true, groupId: true },
    });
    if (teams.length !== 2) {
      return NextResponse.json({ error: tournament.teamsNotInTournament }, { status: 400 });
    }
    const homeGroupId = teams.find((t) => t.id === homeTeamId)!.groupId;
    const awayGroupId = teams.find((t) => t.id === awayTeamId)!.groupId;
    if (!isValidLeaguePairing(!!isKnockout, homeGroupId, awayGroupId)) {
      return NextResponse.json(
        {
          error:
            "لا يمكن إنشاء مباراة دور مجموعات بين فريقين من مجموعتين مختلفتين — فعّل «مباراة خروج المغلوب» إن كانت مباراة إقصائية",
        },
        { status: 400 },
      );
    }
    if (round !== undefined && round !== null && String(round).trim().length > 40) {
      return NextResponse.json(
        { error: "اسم الجولة طويل جداً (40 حرفاً كحد أقصى)" },
        { status: 400 },
      );
    }
    if (venue !== undefined && venue !== null && String(venue).trim().length > 60) {
      return NextResponse.json(
        { error: "اسم الملعب طويل جداً (60 حرفاً كحد أقصى)" },
        { status: 400 },
      );
    }

    const maxOrderRow = await prisma.match.findFirst({
      where: { activityId: id },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const match = await prisma.match.create({
      data: {
        activityId: id,
        homeTeamId,
        awayTeamId,
        matchDate: matchDate ? parseMatchDate(matchDate) : null,
        round: round?.trim() || null,
        venue: venue?.trim() || null,
        isKnockout: !!isKnockout,
        order: (maxOrderRow?.order || 0) + 1,
      },
      include: MATCH_INCLUDE,
    });

    const home = teams.find((t) => t.id === homeTeamId)!;
    const away = teams.find((t) => t.id === awayTeamId)!;
    await logAction(session.username, "CREATE_MATCH", `${home.name} × ${away.name}`, {
      ...auditContext(session, req),
      targetType: "Match",
      targetId: match.id,
      after: {
        activityId: id,
        homeTeam: home.name,
        awayTeam: away.name,
        matchDate: match.matchDate,
        isKnockout: match.isKnockout,
      },
    });

    notifyTeams(homeTeamId, awayTeamId, notify.matchScheduled(home.name, away.name, id)).catch(
      (err) => logger.error("match.created.push.error", err),
    );

    return NextResponse.json({ match }, { status: 201 });
  },
);
