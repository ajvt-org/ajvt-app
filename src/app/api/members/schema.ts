import { z } from "zod";
import { validatePaidAmount } from "@/lib/donations";
import { isValidReferenceCode } from "@/lib/referenceCode";
import { ageGroups, common, members } from "@/lib/messages";

const INVALID = common.invalidBody;

export function memberSubmissionSchema(fee: number) {
  return z.object({
    fullName: z
      .string(members.fullNameRequired)
      .min(1, members.fullNameRequired)
      .refine((v) => v.trim().length <= 30, members.fullNameTooLong),
    phone: z.string("رقم الهاتف مطلوب").min(1, "رقم الهاتف مطلوب"),
    age: z
      .string(members.pickAgeGroup)
      .min(1, members.pickAgeGroup)
      .refine((v) => v.trim().length <= 30, ageGroups.nameTooLong),
    paymentMethod: z.string(members.pickPaymentMethod).min(1, members.pickPaymentMethod),
    paymentProof: z.string("يرجى إرفاق صورة الكابتير").min(1, "يرجى إرفاق صورة الكابتير"),
    photo: z.string(INVALID).nullish(),
    referenceCode: z.string(INVALID).refine(isValidReferenceCode, INVALID).nullish(),
    paidAmount: z.unknown().superRefine((v, ctx) => {
      const message = validatePaidAmount(v, fee);
      if (message) ctx.addIssue({ code: "custom", message });
    }),
    id: z.string().optional(),
  });
}

export type MemberSubmission = z.infer<ReturnType<typeof memberSubmissionSchema>>;
