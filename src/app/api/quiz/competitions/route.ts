import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { ForbiddenError } from "@/lib/errors";
import { isQuizEligible } from "@/lib/quiz";
import { runningCompetitionsFor } from "@/lib/competitionServer";
import { quiz } from "@/lib/messages";

export const GET = withRoute("GET /api/quiz/competitions", async () => {
  const session = await requireUser();
  if (!(await isQuizEligible(session.userId))) throw new ForbiddenError(quiz.paidMembersOnly);

  const running = await runningCompetitionsFor(session.userId);
  return NextResponse.json({
    competitions: running.map((c) => ({
      id: c.id,
      name: c.name,
      visibility: c.visibility,
      roundCount: c.roundCount,
      startsAt: c.startsAt,
    })),
  });
});
