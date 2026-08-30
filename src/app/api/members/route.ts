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
import { members } from "@/lib/messages";
import { recordMembershipPayment } from "@/lib/membershipPaymentServer";
import { saveMembershipYear } from "@/lib/membershipRecord";
import { currentMembership } from "@/lib/currentMembershipServer";

const CODE_ATTEMPTS = 5;

export const POST = withRoute("Member create", async (req: NextRequest) => {
  const session = await requireUser();
  const { membershipFee, membershipYear } = await getAppSettings();
  const { id, paymentMethod, paymentProof, paidAmount, referenceCode, surplusAnonymous } = parse(
    memberSubmissionSchema(membershipFee),
    await req.json(),
  );

  const person = await prisma.user.findUniqueOrThrow({
    where: { id: session.userId },
    select: { fullName: true, members: { select: { id: true }, take: 1 } },
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

  if (person.members.length) {
    throw new ConflictError(members.alreadyHasRequest);
  }

  let code: string | null = referenceCode || null;

  for (let attempt = 0; ; attempt++) {
    try {
      const member = await prisma.$transaction(async (tx) => {
        const created = await tx.member.create({ data: { userId: session.userId } });
        await saveMembershipYear(tx, session.userId, membershipYear, {
          paymentMethod,
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
        return { id: created.id, referenceCode: code };
      });
      return NextResponse.json(
        { id: member.id, referenceCode: member.referenceCode },
        { status: 201 },
      );
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
