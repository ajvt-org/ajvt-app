import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { paymentAccounts as messages } from "@/lib/messages";
import { nextAccountPosition, readCode, readName } from "@/lib/paymentMethodAdmin";
import { accountsOf } from "@/lib/paymentAccountsServer";

const MAX = 30;

type Params = { params: Promise<{ id: string; accountId: string }> };

export const POST = withRoute(
  "POST /api/admin/payment-methods/[id]/accounts/[accountId]/replace",
  async (req: NextRequest, { params }: Params) => {
    const session = await requireAdminRole();
    const { id, accountId } = await params;
    const body = await req.json();

    const closing = await prisma.paymentAccount.findFirst({
      where: { id: accountId, methodId: id },
    });
    if (!closing) return NextResponse.json({ error: messages.notFound }, { status: 404 });
    if (closing.closedAt) {
      return NextResponse.json({ error: messages.alreadyClosed }, { status: 409 });
    }

    const code = readCode(body.code);
    if (!code) return NextResponse.json({ error: messages.codeRequired }, { status: 400 });
    if (code.length > MAX) {
      return NextResponse.json({ error: messages.codeTooLong }, { status: 400 });
    }
    if (code === closing.code) {
      return NextResponse.json({ error: messages.sameCode }, { status: 400 });
    }

    const label = readName(body.label);
    if (label.length > MAX) {
      return NextResponse.json({ error: messages.labelTooLong }, { status: 400 });
    }

    const clash = await prisma.paymentAccount.findUnique({
      where: { methodId_code: { methodId: id, code } },
    });
    if (clash) return NextResponse.json({ error: messages.exists }, { status: 409 });

    const closedAt = new Date();
    const position = nextAccountPosition(await accountsOf(id));

    const opened = await prisma.$transaction(async (tx) => {
      await tx.paymentAccount.update({
        where: { id: accountId },
        data: { closedAt, active: false },
      });
      return tx.paymentAccount.create({
        data: { methodId: id, code, label: label || null, position },
      });
    });

    const pair = `${closing.code} → ${opened.code}`;

    await logAction(session.username, "CLOSE_PAYMENT_ACCOUNT", pair, {
      ...auditContext(session, req),
      targetType: "PaymentAccount",
      targetId: closing.id,
      before: { code: closing.code, active: closing.active, closedAt: closing.closedAt },
      after: { code: closing.code, active: false, closedAt },
    });

    await logAction(session.username, "CREATE_PAYMENT_ACCOUNT", pair, {
      ...auditContext(session, req),
      targetType: "PaymentAccount",
      targetId: opened.id,
      after: { code: opened.code, label: opened.label, active: opened.active },
    });

    return NextResponse.json({ closed: closing.id, account: opened }, { status: 201 });
  },
);
