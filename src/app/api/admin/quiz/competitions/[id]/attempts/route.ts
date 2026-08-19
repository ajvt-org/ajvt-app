import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { ValidationError } from "@/lib/errors";
import { attemptsInRound } from "@/lib/quizBreakdownServer";
import { common } from "@/lib/messages";

export const GET = withRoute(
  "GET /api/admin/quiz/competitions/[id]/attempts",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdminRole("QUIZ");
    const { id } = await params;
    const round = Number(req.nextUrl.searchParams.get("round"));
    if (!Number.isInteger(round) || round < 0) throw new ValidationError(common.invalidBody);
    return NextResponse.json({ attempts: await attemptsInRound(id, round) });
  },
);
