import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { parse } from "@/lib/validation";
import { memberSubmissionSchema } from "./schema";
import { getAppSettings } from "@/lib/settingsServer";
import { withRoute } from "@/lib/route";
import { methodsWithAccounts } from "@/lib/paymentMethodsServer";
import { methodNames, payableMethods } from "@/lib/paymentMethods";
import { submitMembership } from "@/lib/selfMembershipServer";

export const POST = withRoute("Member create", async (req: NextRequest) => {
  const session = await requireUser();
  const { membershipFee, membershipYear } = await getAppSettings();
  const payable = payableMethods(await methodsWithAccounts());
  const input = parse(
    memberSubmissionSchema(membershipFee, methodNames(payable)),
    await req.json(),
  );

  const { resubmitted, referenceCode } = await submitMembership(session.userId, input, {
    membershipFee,
    membershipYear,
    payable,
  });

  if (resubmitted) return NextResponse.json({ id: input.id }, { status: 200 });
  return NextResponse.json({ id: session.userId, referenceCode }, { status: 201 });
});
