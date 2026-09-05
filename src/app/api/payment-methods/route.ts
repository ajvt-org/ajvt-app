import { NextResponse } from "next/server";
import { methodsWithAccounts } from "@/lib/paymentMethodsServer";
import { openAccounts, payableMethods } from "@/lib/paymentMethods";
import { withRoute } from "@/lib/route";

export const GET = withRoute("GET /api/payment-methods", async () => {
  const methods = payableMethods(await methodsWithAccounts()).map((method) => ({
    name: method.name,
    accounts: openAccounts(method.accounts).map(({ id, code, label }) => ({ id, code, label })),
  }));
  return NextResponse.json({ methods });
});
