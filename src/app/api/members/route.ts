import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { generateReferenceCode } from "@/lib/referenceCode";
import { parse } from "@/lib/validation";
import { memberSubmissionSchema } from "./schema";
import { getAppSettings } from "@/lib/settingsServer";
import { withRoute } from "@/lib/route";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { isUniqueViolation } from "@/lib/prismaError";
import { members } from "@/lib/messages";

const CODE_ATTEMPTS = 5;

export const POST = withRoute("Member create", async (req: NextRequest) => {
  const session = await requireUser();
  const { membershipFee } = await getAppSettings();
  const {
    id,
    fullName,
    phone,
    age,
    paymentMethod,
    paymentProof,
    photo,
    paidAmount,
    referenceCode,
  } = parse(memberSubmissionSchema(membershipFee), await req.json());

  // Editing an existing entry (fix a typo while PENDING, or resubmit after REJECTED)
  if (id) {
    const existing = await prisma.member.findUnique({ where: { id } });
    if (!existing || existing.userId !== session.userId) {
      throw new NotFoundError(members.notFound);
    }
    if (existing.status === "ACTIVE") {
      throw new ConflictError("هذا العضو مقبول بالفعل");
    }

    const updated = await prisma.member.update({
      where: { id },
      data: {
        fullName: fullName.trim(),
        phone: phone.trim(),
        age: age.trim(),
        paymentMethod,
        paymentProof,
        ...(photo !== undefined ? { photo } : {}),
        // Never overwrite an existing code — the member may already have
        // written it on a real bank transfer note.
        ...(!existing.referenceCode && referenceCode ? { referenceCode } : {}),
        paidAmount: Number(paidAmount),
        status: "PENDING",
        rejectionReason: null,
      },
    });
    return NextResponse.json({ id: updated.id }, { status: 200 });
  }

  // New member under this account — no cap on how many
  let code: string | null = referenceCode || null;

  for (let attempt = 0; ; attempt++) {
    try {
      const member = await prisma.member.create({
        data: {
          userId: session.userId,
          fullName: fullName.trim(),
          phone: phone.trim(),
          age: age.trim(),
          paymentMethod,
          paymentProof,
          photo: photo || null,
          paidAmount: Number(paidAmount),
          referenceCode: code,
          status: "PENDING",
        },
      });
      return NextResponse.json(
        { id: member.id, referenceCode: member.referenceCode },
        { status: 201 },
      );
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      if (!code || attempt >= CODE_ATTEMPTS) {
        throw new ConflictError("رمز الطلب مستخدم بالفعل، يرجى إعادة المحاولة");
      }
      code = generateReferenceCode();
    }
  }
});
