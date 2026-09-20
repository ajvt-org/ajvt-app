import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { requireBank } from "@/lib/questionBankServer";
import { createQuestion, questionRows } from "@/lib/quizQuestionsServer";

const LABEL_MAX = 60;

export const GET = withRoute("GET /api/admin/quiz/questions", async (req: NextRequest) => {
  await requireAdminRole("QUIZ");
  const bank = await requireBank(req.nextUrl.searchParams.get("bank"));

  return NextResponse.json({ questions: await questionRows(bank.id), bank });
});

export const POST = withRoute("POST /api/admin/quiz/questions", async (req: NextRequest) => {
  const session = await requireAdminRole("QUIZ");
  const body = await req.json();
  const bank = await requireBank(body.bankId);

  const question = await createQuestion(bank.id, body, session.username);

  await logAction(session.username, "CREATE_QUIZ_QUESTION", question.text.slice(0, LABEL_MAX));

  return NextResponse.json({ question }, { status: 201 });
});
