import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { getQuizSettings } from "@/lib/quiz";
import { withRoute } from "@/lib/route";
import { ValidationError } from "@/lib/errors";
import { reviewImport } from "@/lib/quizImport";
import { requireBank } from "@/lib/questionBankServer";
import { common } from "@/lib/messages";

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
      preview: review.questions.slice(0, 5),
    });
  }

  if (review.questions.length === 0) {
    return NextResponse.json({ imported: 0, problems: review.problems });
  }

  const existing = await prisma.quizQuestion.findMany({
    where: { bankId: bank.id },
    select: { text: true },
  });
  const seen = new Set(existing.map((q) => q.text.replace(/\s+/g, " ").trim().toLowerCase()));

  const fresh = review.questions.filter(
    (q) => !seen.has(q.text.replace(/\s+/g, " ").trim().toLowerCase()),
  );
  const skipped = review.questions.length - fresh.length;

  await prisma.$transaction(
    fresh.map((q) =>
      prisma.quizQuestion.create({
        data: {
          text: q.text,
          category: q.category,
          points: q.points,
          correctCount: q.correctCount,
          bankId: bank.id,
          createdBy: session.username,
          answers: {
            create: q.answers.map((a, i) => ({
              text: a.text,
              isCorrect: a.isCorrect,
              order: i,
            })),
          },
        },
      }),
    ),
  );

  await logAction(session.username, "IMPORT_QUIZ_QUESTIONS", `${fresh.length}`, {
    ...auditContext(session, req),
    targetType: "QuizQuestion",
    meta: { imported: fresh.length, skipped, rejected: review.problems.length },
  });

  return NextResponse.json({
    imported: fresh.length,
    skipped,
    problems: review.problems,
  });
});
