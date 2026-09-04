import { z } from "zod";
import { validatePaidAmount } from "@/lib/donations";
import { isValidReferenceCode } from "@/lib/referenceCode";
import { common, members, money } from "@/lib/messages";

const INVALID = common.invalidBody;

export function memberSubmissionSchema(fee: number, offered: readonly string[]) {
  return z.object({
    paymentMethod: z
      .string(members.pickPaymentMethod)
      .min(1, members.pickPaymentMethod)
      .refine((value) => offered.includes(value), money.paymentMethodInvalid),
    paymentProof: z.string(members.attachProof).min(1, members.attachProof),
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
