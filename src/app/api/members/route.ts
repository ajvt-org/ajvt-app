import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { validatePaidAmount } from "@/lib/donations";
import { generateReferenceCode, isValidReferenceCode } from "@/lib/referenceCode";
import { withRoute } from "@/lib/route";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";

const CODE_ATTEMPTS = 5;

function isUniqueViolation(err: unknown): boolean {
  return !!err && typeof err === "object" && "code" in err && err.code === "P2002";
}

export const POST = withRoute("Member create", async (req: NextRequest) => {
  const session = await requireUser();
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
  } = await req.json();

  if (!fullName) throw new ValidationError("الاسم الكامل مطلوب");
  if (!phone) throw new ValidationError("رقم الهاتف مطلوب");
  if (!age) throw new ValidationError("يرجى اختيار العصر");
  if (!paymentMethod) throw new ValidationError("يرجى اختيار طريقة الدفع");
  if (!paymentProof) throw new ValidationError("يرجى إرفاق صورة الكابتير");
  if (fullName.trim().length > 30) {
    throw new ValidationError("الاسم الكامل طويل جداً (30 حرفاً كحد أقصى)");
  }
  if (age.trim().length > 30) {
    throw new ValidationError("اسم العصر طويل جداً (30 حرفاً كحد أقصى)");
  }
  if (photo !== undefined && photo !== null && typeof photo !== "string") {
    throw new ValidationError("بيانات غير صالحة");
  }
  if (
    referenceCode !== undefined &&
    referenceCode !== null &&
    !isValidReferenceCode(referenceCode)
  ) {
    throw new ValidationError("بيانات غير صالحة");
  }
  const paidAmountError = validatePaidAmount(paidAmount);
  if (paidAmountError) throw new ValidationError(paidAmountError);

  // Editing an existing entry (fix a typo while PENDING, or resubmit after REJECTED)
  if (id) {
    const existing = await prisma.member.findUnique({ where: { id } });
    if (!existing || existing.userId !== session.userId) {
      throw new NotFoundError("العضو غير موجود");
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
