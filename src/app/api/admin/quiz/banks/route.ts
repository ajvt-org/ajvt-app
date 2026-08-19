import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { ValidationError } from "@/lib/errors";
import { listBanks, createBank } from "@/lib/questionBankServer";
import { common } from "@/lib/messages";

export const GET = withRoute("GET /api/admin/quiz/banks", async () => {
  await requireAdminRole("QUIZ");
  return NextResponse.json({ banks: await listBanks() });
});

export const POST = withRoute("POST /api/admin/quiz/banks", async (req: NextRequest) => {
  const session = await requireAdminRole("QUIZ");
  let body: { name?: unknown };
  try {
    body = await req.json();
  } catch {
    throw new ValidationError(common.invalidBody);
  }

  const bank = await createBank(body.name);

  await logAction(session.username, "CREATE_QUESTION_BANK", bank.name, {
    ...auditContext(session, req),
    targetType: "QuestionBank",
    targetId: bank.id,
  });

  return NextResponse.json({ bank }, { status: 201 });
});
