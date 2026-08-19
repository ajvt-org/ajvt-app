import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { ValidationError } from "@/lib/errors";
import { listCompetitions, saveCompetition } from "@/lib/competitionServer";
import { DEFAULT_CONFIG } from "@/lib/competitionConfig";
import { common } from "@/lib/messages";

export const GET = withRoute("GET /api/admin/quiz/competitions", async () => {
  await requireAdminRole("QUIZ");
  return NextResponse.json({
    competitions: await listCompetitions(),
    defaults: DEFAULT_CONFIG,
  });
});

export const POST = withRoute("POST /api/admin/quiz/competitions", async (req: NextRequest) => {
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

  return NextResponse.json({ competition }, { status: 201 });
});
