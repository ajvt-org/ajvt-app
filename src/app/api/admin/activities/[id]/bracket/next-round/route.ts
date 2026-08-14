import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { getMatchWinnerTeamId, bracketRoundLabel } from "@/lib/tournament";

// Advances the bracket by one round: takes the winners of the current
// (fully-played) round and pairs them up. Works the same whether the
// current round came from a random draw or from crossed semis.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdminRole("ACTIVITIES");
    const { id } = await params;

    const bracketMatches = await prisma.match.findMany({
      where: { activityId: id, bracketRound: { not: null } },
      orderBy: [{ bracketRound: "desc" }, { order: "asc" }],
      select: {
        id: true,
        bracketRound: true,
        order: true,
        homeTeamId: true,
        awayTeamId: true,
        homeScore: true,
        awayScore: true,
        homePenalties: true,
        awayPenalties: true,
        status: true,
      },
    });

    if (bracketMatches.length === 0) {
      return NextResponse.json(
        { error: "لم تبدأ القرعة بعد — أجرِ القرعة أو ولّد نصف النهائي أولاً" },
        { status: 400 },
      );
    }

    const maxRound = bracketMatches[0].bracketRound as number;
    const currentRound = bracketMatches
      .filter((m) => m.bracketRound === maxRound)
      .sort((a, b) => a.order - b.order);

    if (currentRound.length === 1) {
      return NextResponse.json({ error: "هذا الدور هو النهائي بالفعل" }, { status: 409 });
    }
    if (currentRound.length % 2 !== 0) {
      return NextResponse.json(
        { error: "عدد مباريات هذا الدور فردي — تحقّق من عدم حذف إحدى المباريات يدوياً" },
        { status: 409 },
      );
    }
    if (currentRound.some((m) => m.status !== "PLAYED")) {
      return NextResponse.json({ error: "أكمل نتائج الدور الحالي أولاً" }, { status: 409 });
    }

    const winners: string[] = [];
    for (const m of currentRound) {
      const winner = getMatchWinnerTeamId(m);
      if (!winner) {
        return NextResponse.json(
          {
            error: "إحدى مباريات هذا الدور تعادلت دون ركلات ترجيح — أدخل نتيجة ركلات الترجيح أولاً",
          },
          { status: 409 },
        );
      }
      winners.push(winner);
    }

    const maxOrderRow = await prisma.match.findFirst({
      where: { activityId: id },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    let nextOrder = (maxOrderRow?.order || 0) + 1;
    const nextRound = maxRound + 1;
    const label = bracketRoundLabel(winners.length / 2);

    const data = [];
    for (let i = 0; i < winners.length; i += 2) {
      data.push({
        activityId: id,
        homeTeamId: winners[i],
        awayTeamId: winners[i + 1],
        isKnockout: true,
        bracketRound: nextRound,
        round: label,
        order: nextOrder++,
      });
    }

    await prisma.match.createMany({ data });
    await logAction(
      session.username,
      "GENERATE_BRACKET_NEXT_ROUND",
      `${label} — ${data.length} مباراة`,
    );

    return NextResponse.json({ ok: true, created: data.length });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "ليس لديك صلاحية لهذا الإجراء" }, { status: 403 });
    }
    console.error("Bracket next round error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
