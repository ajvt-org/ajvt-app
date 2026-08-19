import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { ValidationError } from "@/lib/errors";
import { getCompetition, saveCompetition, resetCompetitionScores } from "@/lib/competitionServer";
import { DEFAULT_CONFIG } from "@/lib/competitionConfig";
import { common } from "@/lib/messages";

export const GET = withRoute("GET /api/admin/quiz/competition", async () => {
  await requireAdminRole("QUIZ");
  return NextResponse.json({
    competition: await getCompetition(),
    defaults: DEFAULT_CONFIG,
  });
});

export const PUT = withRoute("PUT /api/admin/quiz/competition", async (req: NextRequest) => {
  const session = await requireAdminRole("QUIZ");
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    throw new ValidationError(common.invalidBody);
  }

  const competition = await saveCompetition(body);

  await logAction(session.username, "SAVE_COMPETITION", competition.name, {
    ...auditContext(session, req),
    targetType: "Competition",
    targetId: competition.id,
    after: { startsAt: competition.startsAt, roundCount: competition.roundCount },
  });

  return NextResponse.json({ competition });
});

export const DELETE = withRoute("DELETE /api/admin/quiz/competition", async (req: NextRequest) => {
  const session = await requireAdminRole("QUIZ");
  const cleared = await resetCompetitionScores();

  await logAction(session.username, "RESET_QUIZ_SCORES", `${cleared}`, {
    ...auditContext(session, req),
    targetType: "Competition",
    meta: { cleared },
  });

  return NextResponse.json({ cleared });
});
