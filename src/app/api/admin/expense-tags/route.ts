import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { expenses as messages } from "@/lib/messages";

// A tag carries how much has been spent under it, which is the reason the
// tags exist: the list on its own says nothing an admin could not already see.
export const GET = withRoute("GET /api/admin/expense-tags", async () => {
  await requireAdmin();
  const tags = await prisma.expenseTag.findMany({
    orderBy: { createdAt: "asc" },
    include: { expenses: { select: { amount: true } } },
  });
  return NextResponse.json({
    tags: tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      count: tag.expenses.length,
      total: tag.expenses.reduce((sum, e) => sum + e.amount, 0),
    })),
  });
});

export const POST = withRoute("POST /api/admin/expense-tags", async (req: NextRequest) => {
  const session = await requireAdmin();
  const { name } = await req.json();
  const trimmed = typeof name === "string" ? name.trim() : "";

  if (!trimmed) return NextResponse.json({ error: messages.tagNameRequired }, { status: 400 });
  if (trimmed.length > 30) {
    return NextResponse.json({ error: messages.tagNameTooLong }, { status: 400 });
  }

  const existing = await prisma.expenseTag.findUnique({ where: { name: trimmed } });
  if (existing) return NextResponse.json({ error: messages.tagExists }, { status: 409 });

  const tag = await prisma.expenseTag.create({ data: { name: trimmed } });
  await logAction(session.username, "CREATE_EXPENSE_TAG", tag.name, {
    ...auditContext(session, req),
    targetType: "ExpenseTag",
    targetId: tag.id,
    after: { name: tag.name },
  });

  return NextResponse.json(
    { tag: { id: tag.id, name: tag.name, count: 0, total: 0 } },
    { status: 201 },
  );
});
