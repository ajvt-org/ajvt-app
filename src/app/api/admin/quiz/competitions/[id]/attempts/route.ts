import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { ValidationError } from "@/lib/errors";
import { attemptsInRound } from "@/lib/quizBreakdownServer";
import { requireCompetition, shapeOf } from "@/lib/competitionServer";
import { windowAt } from "@/lib/quizRound";
import { common } from "@/lib/messages";

export const GET = withRoute(
  "GET /api/admin/quiz/competitions/[id]/attempts",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdminRole("QUIZ");
    const { id } = await params;
    const round = Number(req.nextUrl.searchParams.get("round"));
    if (!Number.isInteger(round) || round < 0) throw new ValidationError(common.invalidBody);

    const competition = await requireCompetition(id);
    const window = windowAt(shapeOf(competition), round);
    const opened = Boolean(competition.startedAt && window && window.opensAt <= new Date());
    return NextResponse.json({ attempts: await attemptsInRound(id, round), opened });
  },
);
