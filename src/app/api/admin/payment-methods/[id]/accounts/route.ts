import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { paymentAccounts as messages, paymentMethods as methodMessages } from "@/lib/messages";
import {
  adminAccountRows,
  nextAccountPosition,
  readCode,
  readName,
} from "@/lib/paymentMethodAdmin";
import { accountsOf, accountUsage } from "@/lib/paymentAccountsServer";

const MAX = 30;

export const GET = withRoute(
  "GET /api/admin/payment-methods/[id]/accounts",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    await requireAdminRole();
    const { id } = await params;
    return NextResponse.json({
      accounts: adminAccountRows(await accountsOf(id), await accountUsage()),
    });
  },
);

export const POST = withRoute(
  "POST /api/admin/payment-methods/[id]/accounts",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole();
    const { id } = await params;
    const body = await req.json();

    const method = await prisma.paymentMethod.findUnique({ where: { id } });
    if (!method) return NextResponse.json({ error: methodMessages.notFound }, { status: 404 });

    const code = readCode(body.code);
    if (!code) return NextResponse.json({ error: messages.codeRequired }, { status: 400 });
    if (code.length > MAX) {
      return NextResponse.json({ error: messages.codeTooLong }, { status: 400 });
    }

    const label = readName(body.label);
    if (label.length > MAX) {
      return NextResponse.json({ error: messages.labelTooLong }, { status: 400 });
    }

    const clash = await prisma.paymentAccount.findUnique({
      where: { methodId_code: { methodId: id, code } },
    });
    if (clash) return NextResponse.json({ error: messages.exists }, { status: 409 });

    const account = await prisma.paymentAccount.create({
      data: {
        methodId: id,
        code,
        label: label || null,
        position: nextAccountPosition(await accountsOf(id)),
      },
    });

    await logAction(session.username, "CREATE_PAYMENT_ACCOUNT", `${method.name} ${code}`, {
      ...auditContext(session, req),
      targetType: "PaymentAccount",
      targetId: account.id,
      after: { code: account.code, label: account.label, active: account.active },
    });

    return NextResponse.json({ account }, { status: 201 });
  },
);
