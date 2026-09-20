import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import {
  changePaymentMethod,
  paymentMethodOrNotFound,
  reorderPaymentMethod,
} from "@/lib/paymentMethodAdminServer";

export const PATCH = withRoute(
  "PATCH /api/admin/payment-methods/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const session = await requireAdminRole();
    const { id } = await params;
    const body = await req.json();

    const existing = await paymentMethodOrNotFound(id);
    const target = { ...auditContext(session, req), targetType: "PaymentMethod", targetId: id };

    if (body.move === "up" || body.move === "down") {
      const moved = await reorderPaymentMethod(id, body.move);
      if (!moved) return NextResponse.json({ method: existing });

      await logAction(session.username, "REORDER_PAYMENT_METHOD", existing.name, {
        ...target,
        before: { position: moved.from },
        after: { position: moved.to },
      });
      return NextResponse.json({ method: moved.method });
    }

    const method = await changePaymentMethod(existing, body);

    await logAction(
      session.username,
      "UPDATE_PAYMENT_METHOD",
      `${existing.name} → ${method.name}`,
      {
        ...target,
        before: {
          name: existing.name,
          active: existing.active,
          memberFacing: existing.memberFacing,
          carriesNumbers: existing.carriesNumbers,
        },
        after: {
          name: method.name,
          active: method.active,
          memberFacing: method.memberFacing,
          carriesNumbers: method.carriesNumbers,
        },
      },
    );

    return NextResponse.json({ method });
  },
);
