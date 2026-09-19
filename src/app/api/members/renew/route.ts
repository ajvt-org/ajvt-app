import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { getAppSettings } from "@/lib/settingsServer";
import { methodsWithAccounts } from "@/lib/paymentMethodsServer";
import { methodNames, payableMethods } from "@/lib/paymentMethods";
import { logAction } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { nameOf } from "@/lib/person";
import { membershipPaymentSchema } from "../schema";
import { renewOwnMembership } from "@/lib/selfRenewServer";

export const POST = withRoute("Member renew", async (req: NextRequest) => {
  const session = await requireUser();
  const { membershipFee, membershipYear } = await getAppSettings();
  const payable = payableMethods(await methodsWithAccounts());
  const input = parse(
    membershipPaymentSchema(membershipFee, methodNames(payable)),
    await req.json(),
  );

  const { account, before } = await renewOwnMembership(session.userId, input, {
    membershipFee,
    membershipYear,
    payable,
  });

  await logAction(
    nameOf(account),
    "RENEW_OWN_MEMBERSHIP",
    `${nameOf(account)} — ${membershipYear}`,
    {
      targetType: "Member",
      targetId: session.userId,
      before: { membershipYear: before },
      after: { membershipYear, status: "PENDING", paidAmount: Number(input.paidAmount) },
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent") ?? undefined,
    },
  );

  return NextResponse.json({ year: membershipYear }, { status: 201 });
});
