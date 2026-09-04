import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { paymentAccounts as messages } from "@/lib/messages";
import { readCode, readName, swappedAccountPositions } from "@/lib/paymentMethodAdmin";
import { accountsOf } from "@/lib/paymentAccountsServer";

const MAX = 30;

type Params = { params: Promise<{ id: string; accountId: string }> };

export const PATCH = withRoute(
  "PATCH /api/admin/payment-methods/[id]/accounts/[accountId]",
  async (req: NextRequest, { params }: Params) => {
    const session = await requireAdminRole();
    const { id, accountId } = await params;
    const body = await req.json();

    const existing = await prisma.paymentAccount.findFirst({
      where: { id: accountId, methodId: id },
    });
    if (!existing) return NextResponse.json({ error: messages.notFound }, { status: 404 });

    if (body.move === "up" || body.move === "down") {
      const pair = swappedAccountPositions(await accountsOf(id), accountId, body.move);
      if (!pair) return NextResponse.json({ account: existing });
      const [mine, other] = pair;
      await prisma.$transaction([
        prisma.paymentAccount.update({
          where: { id: mine.id },
          data: { position: other.position },
        }),
        prisma.paymentAccount.update({
          where: { id: other.id },
          data: { position: mine.position },
        }),
      ]);
      await logAction(session.username, "REORDER_PAYMENT_ACCOUNT", existing.code, {
        ...auditContext(session, req),
        targetType: "PaymentAccount",
        targetId: accountId,
        before: { position: mine.position },
        after: { position: other.position },
      });
      return NextResponse.json({
        account: await prisma.paymentAccount.findUnique({ where: { id: accountId } }),
      });
    }

    const data: { code?: string; label?: string | null; active?: boolean } = {};

    if (body.code !== undefined) {
      const code = readCode(body.code);
      if (!code) return NextResponse.json({ error: messages.codeRequired }, { status: 400 });
      if (code.length > MAX) {
        return NextResponse.json({ error: messages.codeTooLong }, { status: 400 });
      }
      const clash = await prisma.paymentAccount.findUnique({
        where: { methodId_code: { methodId: id, code } },
      });
      if (clash && clash.id !== accountId) {
        return NextResponse.json({ error: messages.exists }, { status: 409 });
      }
      data.code = code;
    }

    if (body.label !== undefined) {
      const label = readName(body.label);
      if (label.length > MAX) {
        return NextResponse.json({ error: messages.labelTooLong }, { status: 400 });
      }
      data.label = label || null;
    }

    if (typeof body.active === "boolean") data.active = body.active;

    const account = await prisma.paymentAccount.update({ where: { id: accountId }, data });

    await logAction(session.username, "UPDATE_PAYMENT_ACCOUNT", account.code, {
      ...auditContext(session, req),
      targetType: "PaymentAccount",
      targetId: accountId,
      before: { code: existing.code, label: existing.label, active: existing.active },
      after: { code: account.code, label: account.label, active: account.active },
    });

    return NextResponse.json({ account });
  },
);
