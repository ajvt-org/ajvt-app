import { z } from "zod";
import { validatePaidAmount } from "@/lib/donations";
import { isValidReferenceCode } from "@/lib/referenceCode";

const INVALID = "بيانات غير صالحة";

export const memberSubmissionSchema = z.object({
  fullName: z
    .string("الاسم الكامل مطلوب")
    .min(1, "الاسم الكامل مطلوب")
    .refine((v) => v.trim().length <= 30, "الاسم الكامل طويل جداً (30 حرفاً كحد أقصى)"),
  phone: z.string("رقم الهاتف مطلوب").min(1, "رقم الهاتف مطلوب"),
  age: z
    .string("يرجى اختيار العصر")
    .min(1, "يرجى اختيار العصر")
    .refine((v) => v.trim().length <= 30, "اسم العصر طويل جداً (30 حرفاً كحد أقصى)"),
  paymentMethod: z.string("يرجى اختيار طريقة الدفع").min(1, "يرجى اختيار طريقة الدفع"),
  paymentProof: z.string("يرجى إرفاق صورة الكابتير").min(1, "يرجى إرفاق صورة الكابتير"),
  photo: z.string(INVALID).nullish(),
  referenceCode: z.string(INVALID).refine(isValidReferenceCode, INVALID).nullish(),
  paidAmount: z.unknown().superRefine((v, ctx) => {
    const message = validatePaidAmount(v);
    if (message) ctx.addIssue({ code: "custom", message });
  }),
  id: z.string().optional(),
});

export type MemberSubmission = z.infer<typeof memberSubmissionSchema>;
