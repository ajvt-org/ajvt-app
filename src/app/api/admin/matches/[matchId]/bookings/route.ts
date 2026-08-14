import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";

const CARD_TYPES = ["YELLOW", "RED"];

export async function POST(req: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  try {
    await requireAdminRole("ACTIVITIES");
    const { matchId } = await params;
    const { memberId, teamId, cardType, minute } = await req.json();

    if (!memberId || !teamId || !CARD_TYPES.includes(cardType)) {
      return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
    }
    let minuteValue: number | null = null;
    if (minute !== undefined && minute !== null && minute !== "") {
      const n = Number(minute);
      if (!Number.isInteger(n) || n < 1 || n > 130) {
        return NextResponse.json(
          { error: "الدقيقة يجب أن تكون رقماً صحيحاً بين 1 و130" },
          { status: 400 },
        );
      }
      minuteValue = n;
    }

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { homeTeamId: true, awayTeamId: true },
    });
    if (!match) {
      return NextResponse.json({ error: "المباراة غير موجودة" }, { status: 404 });
    }
    if (teamId !== match.homeTeamId && teamId !== match.awayTeamId) {
      return NextResponse.json({ error: "الفريق لا ينتمي إلى هذه المباراة" }, { status: 400 });
    }

    const inRoster = await prisma.teamMember.findUnique({
      where: { teamId_memberId: { teamId, memberId } },
    });
    if (!inRoster) {
      return NextResponse.json({ error: "اللاعب لا ينتمي إلى هذا الفريق" }, { status: 400 });
    }

    const booking = await prisma.matchBooking.create({
      data: { matchId, memberId, teamId, cardType, minute: minuteValue },
      select: {
        id: true,
        cardType: true,
        minute: true,
        teamId: true,
        member: { select: { id: true, fullName: true } },
      },
    });

    return NextResponse.json({ booking }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "ليس لديك صلاحية لهذا الإجراء" }, { status: 403 });
    }
    console.error("Booking create error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
