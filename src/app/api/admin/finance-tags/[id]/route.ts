import { NextRequest, NextResponse } from "next/server";
import { requireArea } from "@/lib/auth";
import { MONEY_AREAS } from "@/lib/adminNav";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { removeFinanceTag, renameFinanceTag } from "@/lib/financeTagsServer";

export const PATCH = withRoute(
  "PATCH /api/admin/finance-tags/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireArea(MONEY_AREAS.expenses);
    const { id } = await params;
    const { name } = await req.json();

    const { tag, existing } = await renameFinanceTag(id, name);

    await logAction(session.username, "UPDATE_EXPENSE_TAG", `${existing.name} → ${tag.name}`, {
      ...auditContext(session, req),
      targetType: "FinanceTag",
      targetId: tag.id,
      before: { name: existing.name },
      after: { name: tag.name },
    });

    return NextResponse.json({ tag });
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/finance-tags/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireArea(MONEY_AREAS.expenses);
    const { id } = await params;

    const existing = await removeFinanceTag(id);

    await logAction(session.username, "DELETE_EXPENSE_TAG", existing.name, {
      ...auditContext(session, req),
      targetType: "FinanceTag",
      targetId: id,
      before: { name: existing.name },
    });

    return NextResponse.json({ ok: true });
  },
);
