import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import {
  accountOrNotFound,
  changePaymentAccount,
  reorderPaymentAccount,
} from "@/lib/paymentAccountAdminServer";

type Params = { params: Promise<{ id: string; accountId: string }> };

export const PATCH = withRoute(
  "PATCH /api/admin/payment-methods/[id]/accounts/[accountId]",
  async (req: NextRequest, { params }: Params) => {
    const session = await requireAdminRole();
    const { id, accountId } = await params;
    const body = await req.json();

    const existing = await accountOrNotFound(id, accountId);
    const target = {
      ...auditContext(session, req),
      targetType: "PaymentAccount",
      targetId: accountId,
    };

    if (body.move === "up" || body.move === "down") {
      const moved = await reorderPaymentAccount(id, accountId, body.move);
      if (!moved) return NextResponse.json({ account: existing });

      await logAction(session.username, "REORDER_PAYMENT_ACCOUNT", existing.code, {
        ...target,
        before: { position: moved.from },
        after: { position: moved.to },
      });
      return NextResponse.json({ account: moved.account });
    }

    const account = await changePaymentAccount(accountId, body);

    await logAction(session.username, "UPDATE_PAYMENT_ACCOUNT", account.code, {
      ...target,
      before: { code: existing.code, label: existing.label, active: existing.active },
      after: { code: account.code, label: account.label, active: account.active },
    });

    return NextResponse.json({ account });
  },
);
