import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { generateReferenceCode } from "@/lib/referenceCode";
import { parse } from "@/lib/validation";
import { memberSubmissionSchema } from "./schema";
import { getAppSettings } from "@/lib/settingsServer";
import { withRoute } from "@/lib/route";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { isUniqueViolation, uniqueViolationFields } from "@/lib/prismaError";
import { recordMembershipPayment } from "@/lib/membershipPaymentServer";
import { saveMembershipYear } from "@/lib/membershipRecord";
import { currentMembership } from "@/lib/currentMembershipServer";
import { methodsWithAccounts } from "@/lib/paymentMethodsServer";
import { accountIsOpenOn, methodNames, payableMethods } from "@/lib/paymentMethods";
import { members, money } from "@/lib/messages";

const CODE_ATTEMPTS = 5;

export const POST = withRoute("Member create", async (req: NextRequest) => {
  const session = await requireUser();
  const { membershipFee, membershipYear } = await getAppSettings();
  const payable = payableMethods(await methodsWithAccounts());
  const {
    id,
    paymentMethod,
    accountId: declared,
    paymentProof,
    paidAmount,
    referenceCode,
    surplusAnonymous,
  } = parse(memberSubmissionSchema(membershipFee, methodNames(payable)), await req.json());

  const chosen = payable.find((method) => method.name === paymentMethod);
  if (declared && !accountIsOpenOn(chosen, declared)) {
    throw new ValidationError(money.paymentAccountInvalid);
  }
  const accountId = declared ?? null;

  const person = await prisma.user.findUniqueOrThrow({
    where: { id: session.userId },
    select: { fullName: true, memberships: { select: { id: true }, take: 1 } },
  });
  if (!person.fullName?.trim()) {
    throw new ValidationError(members.profileIncomplete);
  }

  if (id) {
    if (id !== session.userId) {
      throw new NotFoundError(members.notFound);
    }
    const current = await currentMembership(prisma, session.userId);
    if (!current) {
      throw new NotFoundError(members.notFound);
    }
    if (current.status === "ACTIVE") {
      throw new ConflictError(members.alreadyAccepted);
    }

    await prisma.$transaction(async (tx) => {
      await saveMembershipYear(tx, session.userId, current.year, {
        paymentMethod,
        accountId,
        paymentProof,
        ...(!current.referenceCode && referenceCode ? { referenceCode } : {}),
        status: "PENDING",
        rejectionReason: null,
      });
      await recordMembershipPayment(
        tx,
        session.userId,
        Number(paidAmount),
        membershipFee,
        surplusAnonymous,
      );
    });
    return NextResponse.json({ id }, { status: 200 });
  }

  if (person.memberships.length) {
    throw new ConflictError(members.alreadyHasRequest);
  }

  let code: string | null = referenceCode || null;

  for (let attempt = 0; ; attempt++) {
    try {
      await prisma.$transaction(async (tx) => {
        await saveMembershipYear(tx, session.userId, membershipYear, {
          paymentMethod,
          accountId,
          paymentProof,
          referenceCode: code,
          status: "PENDING",
        });
        await recordMembershipPayment(
          tx,
          session.userId,
          Number(paidAmount),
          membershipFee,
          surplusAnonymous,
        );
      });
      return NextResponse.json({ id: session.userId, referenceCode: code }, { status: 201 });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      if (uniqueViolationFields(err).includes("userId")) {
        throw new ConflictError(members.alreadyHasRequest);
      }
      if (!code || attempt >= CODE_ATTEMPTS) {
        throw new ConflictError("رمز الطلب مستخدم بالفعل، يرجى إعادة المحاولة");
      }
      code = generateReferenceCode();
    }
  }
});
