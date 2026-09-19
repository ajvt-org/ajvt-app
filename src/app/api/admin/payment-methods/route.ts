import { NextRequest, NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { createPaymentMethod, paymentMethodRows } from "@/lib/paymentMethodAdminServer";

export const GET = withRoute("GET /api/admin/payment-methods", async () => {
  await requireAdminRole();

  return NextResponse.json({ methods: await paymentMethodRows() });
});

export const POST = withRoute("POST /api/admin/payment-methods", async (req: NextRequest) => {
  const session = await requireAdminRole();

  const method = await createPaymentMethod(await req.json());

  await logAction(session.username, "CREATE_PAYMENT_METHOD", method.name, {
    ...auditContext(session, req),
    targetType: "PaymentMethod",
    targetId: method.id,
    after: { name: method.name, memberFacing: method.memberFacing },
  });

  return NextResponse.json({ method }, { status: 201 });
});
