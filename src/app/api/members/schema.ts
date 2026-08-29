import { z } from "zod";
import { validatePaidAmount } from "@/lib/donations";
import { isValidReferenceCode } from "@/lib/referenceCode";
import { common, members } from "@/lib/messages";

const INVALID = common.invalidBody;

export function memberSubmissionSchema(fee: number) {
  return z.object({
    paymentMethod: z.string(members.pickPaymentMethod).min(1, members.pickPaymentMethod),
    paymentProof: z.string("يرجى إرفاق صورة الكابتير").min(1, "يرجى إرفاق صورة الكابتير"),
    referenceCode: z.string(INVALID).refine(isValidReferenceCode, INVALID).nullish(),
    paidAmount: z.unknown().superRefine((v, ctx) => {
      const message = validatePaidAmount(v, fee);
      if (message) ctx.addIssue({ code: "custom", message });
    }),
    surplusAnonymous: z.boolean(INVALID).optional(),
    id: z.string().optional(),
  });
}

export type MemberSubmission = z.infer<ReturnType<typeof memberSubmissionSchema>>;
