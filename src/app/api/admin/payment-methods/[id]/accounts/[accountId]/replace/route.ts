import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { replacePaymentAccount } from "@/lib/paymentAccountAdminServer";

type Params = { params: Promise<{ id: string; accountId: string }> };

export const POST = withRoute(
  "POST /api/admin/payment-methods/[id]/accounts/[accountId]/replace",
  async (req: NextRequest, { params }: Params) => {
    const session = await requireAdminRole();
    const { id, accountId } = await params;

    const { closing, opened, closedAt } = await replacePaymentAccount(
      id,
      accountId,
      await req.json(),
    );
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
