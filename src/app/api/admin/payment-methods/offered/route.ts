import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { offeredMethods, openAccounts } from "@/lib/paymentMethods";
import { methodsWithAccounts } from "@/lib/paymentMethodsServer";

export const GET = withRoute("GET /api/admin/payment-methods/offered", async () => {
  await requireAdminRole();
  const methods = offeredMethods(await methodsWithAccounts()).map((method) => ({
    name: method.name,
    memberFacing: method.memberFacing,
    accounts: openAccounts(method.accounts).map(({ id, code, label }) => ({ id, code, label })),
  }));
  return NextResponse.json({ methods });
});
