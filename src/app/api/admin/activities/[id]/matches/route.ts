import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { notifyTeams } from "@/lib/tournamentNotify";
import { parseMatchDate } from "@/lib/tournament";

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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminRole("ACTIVITIES");
    const { id } = await params;

    const matches = await prisma.match.findMany({
      where: { activityId: id },
      orderBy: [{ status: "asc" }, { order: "asc" }, { createdAt: "asc" }],
      include: MATCH_INCLUDE,
    });

    return NextResponse.json({ matches });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "ليس لديك صلاحية لهذا الإجراء" }, { status: 403 });
    }
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminRole("ACTIVITIES");
    const { id } = await params;
    const { homeTeamId, awayTeamId, matchDate, round, venue, isKnockout } = await req.json();

    if (!homeTeamId || !awayTeamId) {
      return NextResponse.json({ error: "يجب اختيار الفريقين" }, { status: 400 });
    }
    if (homeTeamId === awayTeamId) {
      return NextResponse.json({ error: "لا يمكن أن يلعب الفريق ضد نفسه" }, { status: 400 });
    }

    const teams = await prisma.team.findMany({
      where: { id: { in: [homeTeamId, awayTeamId] }, activityId: id },
      select: { id: true, name: true },
    });
    if (teams.length !== 2) {
      return NextResponse.json({ error: "الفريقان يجب أن ينتميا إلى هذه البطولة" }, { status: 400 });
    }
    if (round !== undefined && round !== null && String(round).trim().length > 40) {
      return NextResponse.json({ error: "اسم الجولة طويل جداً (40 حرفاً كحد أقصى)" }, { status: 400 });
    }
    if (venue !== undefined && venue !== null && String(venue).trim().length > 60) {
      return NextResponse.json({ error: "اسم الملعب طويل جداً (60 حرفاً كحد أقصى)" }, { status: 400 });
    }

    const maxOrderRow = await prisma.match.findFirst({ where: { activityId: id }, orderBy: { order: "desc" }, select: { order: true } });

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
    await logAction(session.username, "CREATE_MATCH", `${home.name} × ${away.name}`);

    notifyTeams(homeTeamId, awayTeamId, {
      title: "رابطة شباب التاكلالت",
      body: `تم تحديد مباراة فريقك: ${home.name} × ${away.name}`,
      url: `/tournament/${id}`,
    }).catch((err) => console.error("Match created push error:", err));

    return NextResponse.json({ match }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "ليس لديك صلاحية لهذا الإجراء" }, { status: 403 });
    }
    console.error("Match create error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
