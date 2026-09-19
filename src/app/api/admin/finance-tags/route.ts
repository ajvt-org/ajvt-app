import { NextRequest, NextResponse } from "next/server";
import { requireArea } from "@/lib/auth";
import { MONEY_AREAS } from "@/lib/adminNav";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { createFinanceTag, listFinanceTags } from "@/lib/financeTagsServer";

export const GET = withRoute("GET /api/admin/finance-tags", async () => {
  await requireArea(MONEY_AREAS.expenses);

  return NextResponse.json({ tags: await listFinanceTags() });
});

export const POST = withRoute("POST /api/admin/finance-tags", async (req: NextRequest) => {
  const session = await requireArea(MONEY_AREAS.expenses);
  const { name } = await req.json();

  const tag = await createFinanceTag(name);

  await logAction(session.username, "CREATE_EXPENSE_TAG", tag.name, {
    ...auditContext(session, req),
    targetType: "FinanceTag",
    targetId: tag.id,
    after: { name: tag.name },
  });

  return NextResponse.json(
    { tag: { id: tag.id, name: tag.name, count: 0, total: 0, incomeCount: 0, income: 0 } },
    { status: 201 },
  );
});
