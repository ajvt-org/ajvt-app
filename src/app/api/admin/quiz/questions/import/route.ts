import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { getQuizSettings } from "@/lib/quiz";
import { withRoute } from "@/lib/route";
import { ValidationError } from "@/lib/errors";
import { reviewImport } from "@/lib/quizImport";
import { requireBank } from "@/lib/questionBankServer";
import { common } from "@/lib/messages";
import { importQuestions } from "@/lib/quizImportServer";

const PREVIEW = 5;

export const POST = withRoute("POST /api/admin/quiz/questions/import", async (req: NextRequest) => {
  const session = await requireAdminRole("QUIZ");

  let body: { questions?: unknown; commit?: unknown; bankId?: unknown };
  try {
    body = await req.json();
  } catch {
    throw new ValidationError(common.invalidBody);
  }

  const bank = await requireBank(typeof body.bankId === "string" ? body.bankId : null);
  const settings = await getQuizSettings();
  const review = reviewImport(body.questions, {
    points: settings.defaultPoints,
    correctCount: settings.defaultCorrectCount,
  });

  if (body.commit !== true) {
    return NextResponse.json({
      accepted: review.questions.length,
      problems: review.problems,
      preview: review.questions.slice(0, PREVIEW),
    });
  }

  if (review.questions.length === 0) {
    return NextResponse.json({ imported: 0, problems: review.problems });
  }

  const { imported, skipped } = await importQuestions(bank.id, review.questions, session.username);

  await logAction(session.username, "IMPORT_QUIZ_QUESTIONS", `${imported}`, {
    ...auditContext(session, req),
    targetType: "QuizQuestion",
    meta: { imported, skipped, rejected: review.problems.length },
  });

  return NextResponse.json({ imported, skipped, problems: review.problems });
});
