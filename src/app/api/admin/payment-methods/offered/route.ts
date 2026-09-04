import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { offeredMethods } from "@/lib/paymentMethods";
import { allPaymentMethods } from "@/lib/paymentMethodsServer";

export const GET = withRoute("GET /api/admin/payment-methods/offered", async () => {
  await requireAdminRole();
  const methods = offeredMethods(await allPaymentMethods()).map(({ name, memberFacing }) => ({
    name,
    memberFacing,
  }));
  return NextResponse.json({ methods });
});
