import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUnscopedAdmin } from "@/lib/activityAccessServer";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { expenses as messages } from "@/lib/messages";

export const GET = withRoute("GET /api/admin/finance-tags", async () => {
  await requireUnscopedAdmin();
  const tags = await prisma.financeTag.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      expenses: { select: { amount: true } },
      donations: { where: { status: "ACTIVE" }, select: { amount: true } },
    },
  });
  return NextResponse.json({
    tags: tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      count: tag.expenses.length,
      total: tag.expenses.reduce((sum, e) => sum + e.amount, 0),
      incomeCount: tag.donations.length,
      income: tag.donations.reduce((sum, d) => sum + (d.amount ?? 0), 0),
    })),
  });
});

export const POST = withRoute("POST /api/admin/finance-tags", async (req: NextRequest) => {
  const session = await requireUnscopedAdmin();
  const { name } = await req.json();
  const trimmed = typeof name === "string" ? name.trim() : "";

  if (!trimmed) return NextResponse.json({ error: messages.tagNameRequired }, { status: 400 });
  if (trimmed.length > 30) {
    return NextResponse.json({ error: messages.tagNameTooLong }, { status: 400 });
  }

  const existing = await prisma.financeTag.findUnique({ where: { name: trimmed } });
  if (existing) return NextResponse.json({ error: messages.tagExists }, { status: 409 });

  const tag = await prisma.financeTag.create({ data: { name: trimmed } });
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
