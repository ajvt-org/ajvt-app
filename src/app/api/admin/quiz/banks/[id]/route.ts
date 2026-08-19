import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { ValidationError } from "@/lib/errors";
import { renameBank, deleteBank } from "@/lib/questionBankServer";
import { common } from "@/lib/messages";

type Params = { params: Promise<{ id: string }> };

export const PATCH = withRoute(
  "PATCH /api/admin/quiz/banks/[id]",
  async (req: NextRequest, { params }: Params) => {
    const session = await requireAdminRole("QUIZ");
    const { id } = await params;
    let body: { name?: unknown };
    try {
      body = await req.json();
    } catch {
      throw new ValidationError(common.invalidBody);
    }

    const bank = await renameBank(id, body.name);

    await logAction(session.username, "RENAME_QUESTION_BANK", bank.name, {
      ...auditContext(session, req),
      targetType: "QuestionBank",
      targetId: bank.id,
    });

    return NextResponse.json({ bank });
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/quiz/banks/[id]",
  async (req: NextRequest, { params }: Params) => {
    const session = await requireAdminRole("QUIZ");
    const { id } = await params;
    const bank = await deleteBank(id);

    await logAction(session.username, "DELETE_QUESTION_BANK", bank.name, {
      ...auditContext(session, req),
      targetType: "QuestionBank",
      targetId: bank.id,
    });

    return NextResponse.json({ deleted: true });
  },
);
