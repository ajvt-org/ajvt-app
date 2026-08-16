import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { expenses as messages } from "@/lib/messages";

export const PATCH = withRoute(
  "PATCH /api/admin/expense-tags/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdmin();
    const { id } = await params;
    const { name } = await req.json();
    const trimmed = typeof name === "string" ? name.trim() : "";

    if (!trimmed) return NextResponse.json({ error: messages.tagNameRequired }, { status: 400 });
    if (trimmed.length > 30) {
      return NextResponse.json({ error: messages.tagNameTooLong }, { status: 400 });
    }

    const existing = await prisma.expenseTag.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: messages.tagNotFound }, { status: 404 });

    const clash = await prisma.expenseTag.findUnique({ where: { name: trimmed } });
    if (clash && clash.id !== id) {
      return NextResponse.json({ error: messages.tagExists }, { status: 409 });
    }

    const tag = await prisma.expenseTag.update({ where: { id }, data: { name: trimmed } });
    await logAction(session.username, "UPDATE_EXPENSE_TAG", `${existing.name} → ${tag.name}`, {
      ...auditContext(session, req),
      targetType: "ExpenseTag",
      targetId: tag.id,
      before: { name: existing.name },
      after: { name: tag.name },
    });

    return NextResponse.json({ tag });
  },
);

// The expenses stay; only the tag goes, and with it the rows joining the two.
export const DELETE = withRoute(
  "DELETE /api/admin/expense-tags/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdmin();
    const { id } = await params;

    const existing = await prisma.expenseTag.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: messages.tagNotFound }, { status: 404 });

    await prisma.expenseTag.delete({ where: { id } });
    await logAction(session.username, "DELETE_EXPENSE_TAG", existing.name, {
      ...auditContext(session, req),
      targetType: "ExpenseTag",
      targetId: id,
      before: { name: existing.name },
    });

    return NextResponse.json({ ok: true });
  },
);
