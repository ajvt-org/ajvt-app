import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { adminAccountRows } from "@/lib/paymentMethodAdmin";
import { accountsOf, accountUsage } from "@/lib/paymentAccountsServer";
import { createPaymentAccount } from "@/lib/paymentAccountAdminServer";

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

    const { account, method } = await createPaymentAccount(id, await req.json());

    await logAction(session.username, "CREATE_PAYMENT_ACCOUNT", `${method.name} ${account.code}`, {
      ...auditContext(session, req),
      targetType: "PaymentAccount",
      targetId: account.id,
      after: { code: account.code, label: account.label, active: account.active },
    });

    return NextResponse.json({ account }, { status: 201 });
  },
);
