import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { paymentMethods as messages } from "@/lib/messages";
import {
  adminAccountRows,
  adminMethodRows,
  nextPosition,
  readName,
} from "@/lib/paymentMethodAdmin";
import { allPaymentMethods } from "@/lib/paymentMethodsServer";
import { accountUsage } from "@/lib/paymentAccountsServer";

export const GET = withRoute("GET /api/admin/payment-methods", async () => {
  await requireAdminRole();
  const methods = await allPaymentMethods();
  const accounts = await prisma.paymentAccount.findMany({
    select: {
      id: true,
      methodId: true,
      code: true,
      label: true,
      position: true,
      active: true,
      closedAt: true,
    },
  });
  const usage = await accountUsage();
  const [expenses, payments, donations] = await Promise.all([
    prisma.expense.groupBy({ by: ["method"], _count: { _all: true } }),
    prisma.payment.groupBy({ by: ["method"], _count: { _all: true } }),
    prisma.donation.groupBy({ by: ["paymentMethod"], _count: { _all: true } }),
  ]);

  const rows = adminMethodRows(methods, [
    ...expenses.map((row) => ({ name: row.method, count: row._count._all })),
    ...payments.map((row) => ({ name: row.method, count: row._count._all })),
    ...donations.map((row) => ({ name: row.paymentMethod, count: row._count._all })),
  ]);

  return NextResponse.json({
    methods: rows.map((method) => ({
      ...method,
      accounts: adminAccountRows(
        accounts.filter((account) => account.methodId === method.id),
        usage,
      ),
    })),
  });
});

export const POST = withRoute("POST /api/admin/payment-methods", async (req: NextRequest) => {
  const session = await requireAdminRole();
  const body = await req.json();
  const name = readName(body.name);

  if (!name) return NextResponse.json({ error: messages.nameRequired }, { status: 400 });
  if (name.length > 30) {
    return NextResponse.json({ error: messages.nameTooLong }, { status: 400 });
  }

  const clash = await prisma.paymentMethod.findUnique({ where: { name } });
  if (clash) return NextResponse.json({ error: messages.exists }, { status: 409 });

  const method = await prisma.paymentMethod.create({
    data: {
      name,
      memberFacing: body.memberFacing === true,
      position: nextPosition(await allPaymentMethods()),
    },
  });
  await logAction(session.username, "CREATE_PAYMENT_METHOD", method.name, {
    ...auditContext(session, req),
    targetType: "PaymentMethod",
    targetId: method.id,
    after: { name: method.name, memberFacing: method.memberFacing },
  });

  return NextResponse.json({ method }, { status: 201 });
});
