import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActivityAccess } from "@/lib/activityAccessServer";
import { logAction } from "@/lib/audit";
import { bracketRoundLabel, shuffleArray, isPowerOfTwo } from "@/lib/tournament";
import { withRoute } from "@/lib/route";
import { incompleteTeams, displayTeamName } from "@/lib/teamSize";
import { counted } from "@/lib/arabicCount";
import { MATCH } from "@/lib/messages";

export const POST = withRoute(
  "POST /api/admin/activities/[id]/bracket/draw",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const session = await requireActivityAccess(id);

    const activity = await prisma.activity.findUnique({
      where: { id },
      select: { teamSize: true },
    });
    const teams = await prisma.team.findMany({
      where: { activityId: id },
      select: {
        id: true,
        name: true,
        autoNamed: true,
        members: { select: { member: { select: { fullName: true } } } },
      },
    });

    const short = incompleteTeams(
      teams.map((t) => ({
        id: t.id,
        name: t.name,
        autoNamed: t.autoNamed,
        memberNames: t.members.map((m) => m.member.fullName),
      })),
      activity?.teamSize ?? null,
    );
    if (short.length > 0) {
      const names = short.map((t) => displayTeamName(t, activity?.teamSize ?? null)).join("، ");
      return NextResponse.json(
        {
          error: `فرق غير مكتملة (${activity?.teamSize} لاعبين لكل فريق): ${names} — أكملها قبل القرعة`,
        },
        { status: 400 },
      );
    }

    if (!isPowerOfTwo(teams.length)) {
      return NextResponse.json(
        {
          error: `عدد الفرق/اللاعبين يجب أن يكون 4 أو 8 أو 16 أو 32... (لديك حالياً ${teams.length}) — أضف أو احذف فرقاً للوصول إلى عدد صحيح`,
        },
        { status: 400 },
      );
    }

    const existingBracket = await prisma.match.findFirst({
      where: { activityId: id, bracketRound: { not: null } },
    });
    if (existingBracket) {
      return NextResponse.json(
        {
          error:
            "توجد قرعة بالفعل لهذه البطولة — احذف مباريات الدور الإقصائي الحالية أولاً لإعادة القرعة",
        },
        { status: 409 },
      );
    }

    const groupsCount = await prisma.group.count({ where: { activityId: id } });
    if (groupsCount > 0) {
      const leagueMatches = await prisma.match.findMany({
        where: { activityId: id, isKnockout: false },
        select: { status: true },
      });
      if (leagueMatches.length === 0 || leagueMatches.some((m) => m.status !== "PLAYED")) {
        return NextResponse.json(
          { error: "أكمل جميع نتائج دور المجموعات أولاً قبل بدء الدور الإقصائي" },
          { status: 409 },
        );
      }
    }

    const maxOrderRow = await prisma.match.findFirst({
      where: { activityId: id },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    let nextOrder = (maxOrderRow?.order || 0) + 1;

    const shuffled = shuffleArray(teams);
    const label = bracketRoundLabel(shuffled.length / 2);
    const data = [];
    for (let i = 0; i < shuffled.length; i += 2) {
      data.push({
        activityId: id,
        homeTeamId: shuffled[i].id,
        awayTeamId: shuffled[i + 1].id,
        isKnockout: true,
        bracketRound: 1,
        round: label,
        order: nextOrder++,
      });
    }

    await prisma.match.createMany({ data });
    await logAction(
      session.username,
      "GENERATE_BRACKET_DRAW",
      `${counted(data.length, MATCH)} — ${label}`,
    );

    return NextResponse.json({ ok: true, created: data.length });
  },
);
