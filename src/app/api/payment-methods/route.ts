import { NextResponse } from "next/server";
import { allPaymentMethods } from "@/lib/paymentMethodsServer";
import { offeredMethods } from "@/lib/paymentMethods";
import { withRoute } from "@/lib/route";

export const GET = withRoute("GET /api/payment-methods", async () => {
  const methods = offeredMethods(await allPaymentMethods()).map(({ name, memberFacing }) => ({
    name,
    memberFacing,
  }));
  return NextResponse.json({ methods });
});
