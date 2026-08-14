import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { bracketRoundLabel, shuffleArray } from "@/lib/tournament";
import { withRoute } from "@/lib/route";

function isPowerOfTwo(n: number): boolean {
  return n >= 2 && (n & (n - 1)) === 0;
}

// Random draw for a pure knockout tournament (chess, PlayStation, or any
// activity without groups) — pairs up every team attached to the activity.
export const POST = withRoute(
  "POST /api/admin/activities/[id]/bracket/draw",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole("ACTIVITIES");
    const { id } = await params;

    const teams = await prisma.team.findMany({
      where: { activityId: id },
      select: { id: true, name: true },
    });
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

    // If the activity uses groups, the knockout stage can't start until the
    // group stage is fully played — otherwise a random draw could pit two
    // teams from the same group against each other before it's decided who
    // actually qualifies.
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
    await logAction(session.username, "GENERATE_BRACKET_DRAW", `${data.length} مباراة — ${label}`);

    return NextResponse.json({ ok: true, created: data.length });
  },
);
