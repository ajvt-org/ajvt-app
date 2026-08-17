import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUnscopedAdmin } from "@/lib/activityAccessServer";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { expenses as messages } from "@/lib/messages";

export const PATCH = withRoute(
  "PATCH /api/admin/finance-tags/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireUnscopedAdmin();
    const { id } = await params;
    const { name } = await req.json();
    const trimmed = typeof name === "string" ? name.trim() : "";

    if (!trimmed) return NextResponse.json({ error: messages.tagNameRequired }, { status: 400 });
    if (trimmed.length > 30) {
      return NextResponse.json({ error: messages.tagNameTooLong }, { status: 400 });
    }

    const existing = await prisma.financeTag.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: messages.tagNotFound }, { status: 404 });

    const clash = await prisma.financeTag.findUnique({ where: { name: trimmed } });
    if (clash && clash.id !== id) {
      return NextResponse.json({ error: messages.tagExists }, { status: 409 });
    }

    const tag = await prisma.financeTag.update({ where: { id }, data: { name: trimmed } });
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
    const session = await requireUnscopedAdmin();
    const { id } = await params;

    const existing = await prisma.financeTag.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: messages.tagNotFound }, { status: 404 });

    await prisma.financeTag.delete({ where: { id } });
    await logAction(session.username, "DELETE_EXPENSE_TAG", existing.name, {
      ...auditContext(session, req),
      targetType: "FinanceTag",
      targetId: id,
      before: { name: existing.name },
    });

    return NextResponse.json({ ok: true });
  },
);
