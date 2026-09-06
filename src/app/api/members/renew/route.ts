import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { getAppSettings } from "@/lib/settingsServer";
import { methodsWithAccounts } from "@/lib/paymentMethodsServer";
import { accountIsOpenOn, methodNames, payableMethods } from "@/lib/paymentMethods";
import { readBankReference } from "@/lib/bankReference";
import { recordMembershipPayment } from "@/lib/membershipPaymentServer";
import { currentMembership } from "@/lib/currentMembershipServer";
import { renewalRefusal } from "@/lib/renewal";
import { renewalRefusalMessage } from "@/lib/renewalMessages";
import { logAction } from "@/lib/audit";
import { getClientIp } from "@/lib/rateLimit";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { members, money } from "@/lib/messages";
import { nameOf } from "@/lib/person";
import { membershipPaymentSchema } from "../schema";

export const POST = withRoute("Member renew", async (req: NextRequest) => {
  const session = await requireUser();
  const { membershipFee, membershipYear } = await getAppSettings();
  const payable = payableMethods(await methodsWithAccounts());
  const { paymentMethod, accountId, bankReference, paymentProof, paidAmount, surplusAnonymous } =
    parse(membershipPaymentSchema(membershipFee, methodNames(payable)), await req.json());

  const chosen = payable.find((method) => method.name === paymentMethod);
  if (accountId && !accountIsOpenOn(chosen, accountId)) {
    throw new ValidationError(money.paymentAccountInvalid);
  }

  const account = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { fullName: true, memberNumber: true },
  });
  if (!account) throw new NotFoundError(members.notFound);

  const current = await currentMembership(prisma, session.userId);
  if (!current) throw new NotFoundError(members.notFound);

  const refusal = renewalRefusal(
    { status: current.status, membershipYear: current.year, memberNumber: account.memberNumber },
    membershipYear,
  );
  if (refusal) throw new ConflictError(renewalRefusalMessage(refusal));

  await prisma.$transaction(async (tx) => {
    await tx.membership.create({
      data: {
        userId: session.userId,
        year: membershipYear,
        status: "PENDING",
        paymentMethod,
        accountId: accountId || null,
        bankReference: readBankReference(bankReference) || null,
        paymentProof,
        recordedBy: nameOf(account),
      },
    });
    await recordMembershipPayment(
      tx,
      session.userId,
      Number(paidAmount),
      membershipFee,
      surplusAnonymous,
    );
  });

  await logAction(
    nameOf(account),
    "RENEW_OWN_MEMBERSHIP",
    `${nameOf(account)} — ${membershipYear}`,
    {
      targetType: "Member",
      targetId: session.userId,
      before: { membershipYear: current.year },
      after: { membershipYear, status: "PENDING", paidAmount: Number(paidAmount) },
      ip: getClientIp(req),
      userAgent: req.headers.get("user-agent") ?? undefined,
    },
  );

  return NextResponse.json({ year: membershipYear }, { status: 201 });
});
