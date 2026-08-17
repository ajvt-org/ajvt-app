import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActivityAccess } from "@/lib/activityAccessServer";
import { logAction } from "@/lib/audit";
import { computeStandings, bracketRoundLabel } from "@/lib/tournament";
import { withRoute } from "@/lib/route";

// Crossed semi-finals from a completed 2-group stage: 1st of A vs 2nd of B,
// 1st of B vs 2nd of A.
export const POST = withRoute(
  "POST /api/admin/activities/[id]/bracket/semis-from-groups",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const session = await requireActivityAccess(id);

    const groups = await prisma.group.findMany({
      where: { activityId: id },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    });
    if (groups.length !== 2) {
      return NextResponse.json(
        {
          error:
            "يجب أن يكون هناك مجموعتان بالضبط (المجموعة أ والمجموعة ب) لتوليد نصف النهائي التلقائي",
        },
        { status: 400 },
      );
    }

    const [teams, matches] = await Promise.all([
      prisma.team.findMany({
        where: { activityId: id },
        select: { id: true, name: true, groupId: true },
      }),
      prisma.match.findMany({
        where: { activityId: id },
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
      return NextResponse.json(
        { error: "أكمل جميع نتائج دور المجموعات أولاً قبل توليد نصف النهائي" },
        { status: 409 },
      );
    }

    const teamsA = teams.filter((t) => t.groupId === groups[0].id);
    const teamsB = teams.filter((t) => t.groupId === groups[1].id);
    if (teamsA.length < 2 || teamsB.length < 2) {
      return NextResponse.json({ error: "كل مجموعة تحتاج فريقين على الأقل" }, { status: 400 });
    }

    const existingBracket = await prisma.match.findFirst({
      where: { activityId: id, bracketRound: { not: null } },
    });
    if (existingBracket) {
      return NextResponse.json(
        { error: "توجد مباريات إقصائية بالفعل لهذه البطولة — احذفها أولاً لإعادة التوليد" },
        { status: 409 },
      );
    }

    const standingsA = computeStandings(teamsA, leagueMatches);
    const standingsB = computeStandings(teamsB, leagueMatches);

    const maxOrderRow = await prisma.match.findFirst({
      where: { activityId: id },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    let nextOrder = (maxOrderRow?.order || 0) + 1;
    const label = bracketRoundLabel(2);

    const data = [
      {
        activityId: id,
        homeTeamId: standingsA[0].teamId,
        awayTeamId: standingsB[1].teamId,
        isKnockout: true,
        bracketRound: 1,
        round: label,
        order: nextOrder++,
      },
      {
        activityId: id,
        homeTeamId: standingsB[0].teamId,
        awayTeamId: standingsA[1].teamId,
        isKnockout: true,
        bracketRound: 1,
        round: label,
        order: nextOrder++,
      },
    ];

    await prisma.match.createMany({ data });
    await logAction(
      session.username,
      "GENERATE_BRACKET_SEMIS",
      `${groups[0].name} × ${groups[1].name}`,
    );

    return NextResponse.json({ ok: true, created: data.length });
  },
);
