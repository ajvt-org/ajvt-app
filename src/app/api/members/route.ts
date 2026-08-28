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
import { members, villages as villageMessages } from "@/lib/messages";
import { ageForVillage, isKnownVillage } from "@/lib/villages";
import { villageNames } from "@/lib/villagesServer";
import { recordMembershipPayment } from "@/lib/membershipPaymentServer";
import { suggestAgeGroup } from "@/lib/ageGroups";

const CODE_ATTEMPTS = 5;

export const POST = withRoute("Member create", async (req: NextRequest) => {
  const session = await requireUser();
  const { membershipFee, membershipYear } = await getAppSettings();
  const {
    id,
    fullName,
    age,
    village,
    paymentMethod,
    paymentProof,
    photo,
    paidAmount,
    referenceCode,
    surplusAnonymous,
  } = parse(memberSubmissionSchema(membershipFee), await req.json());

  if (!isKnownVillage(village, await villageNames())) {
    throw new ValidationError(villageMessages.unknownVillage);
  }
  const ageForRecord = ageForVillage(village, age);

  if (id) {
    const existing = await prisma.member.findUnique({ where: { id } });
    if (!existing || existing.userId !== session.userId) {
      throw new NotFoundError(members.notFound);
    }
    if (existing.status === "ACTIVE") {
      throw new ConflictError("هذا العضو مقبول بالفعل");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const m = await tx.member.update({
        where: { id },
        data: {
          fullName: fullName.trim(),
          age: ageForRecord,
          village: village.trim(),
          paymentMethod,
          paymentProof,
          ...(photo !== undefined ? { photo } : {}),
          ...(!existing.referenceCode && referenceCode ? { referenceCode } : {}),
          ...(surplusAnonymous !== undefined ? { surplusAnonymous } : {}),
          status: "PENDING",
          rejectionReason: null,
        },
      });
      if (ageForRecord) await suggestAgeGroup(tx, ageForRecord);
      await recordMembershipPayment(tx, id, Number(paidAmount), membershipFee);
      return m;
    });
    return NextResponse.json({ id: updated.id }, { status: 200 });
  }

  const account = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { members: { select: { id: true }, take: 1 } },
  });
  if (account?.members.length) {
    throw new ConflictError(members.alreadyHasRequest);
  }

  let code: string | null = referenceCode || null;

  for (let attempt = 0; ; attempt++) {
    try {
      const member = await prisma.$transaction(async (tx) => {
        const created = await tx.member.create({
          data: {
            userId: session.userId,
            fullName: fullName.trim(),
            age: ageForRecord,
            village: village.trim(),
            paymentMethod,
            paymentProof,
            photo: photo || null,
            surplusAnonymous: surplusAnonymous ?? false,
            referenceCode: code,
            status: "PENDING",
            membershipYear,
          },
        });
        if (ageForRecord) await suggestAgeGroup(tx, ageForRecord);
        await recordMembershipPayment(tx, created.id, Number(paidAmount), membershipFee);
        return created;
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
