import { z } from "zod";
import { validatePaidAmount } from "@/lib/donations";
import { isValidReferenceCode } from "@/lib/referenceCode";
import { MAX_BANK_REFERENCE } from "@/lib/bankReference";
import { common, members, money } from "@/lib/messages";

const INVALID = common.invalidBody;

export function membershipPaymentSchema(fee: number, offered: readonly string[]) {
  return z.object({
    paymentMethod: z
      .string(members.pickPaymentMethod)
      .min(1, members.pickPaymentMethod)
      .refine((value) => offered.includes(value), money.paymentMethodInvalid),
    accountId: z.string(INVALID).nullish(),
    bankReference: z.string(INVALID).max(MAX_BANK_REFERENCE, INVALID).nullish(),
    paymentProof: z.string(members.attachProof).min(1, members.attachProof),
    paidAmount: z.unknown().superRefine((v, ctx) => {
      const message = validatePaidAmount(v, fee);
      if (message) ctx.addIssue({ code: "custom", message });
    }),
    surplusAnonymous: z.boolean(INVALID).optional(),
  });
}

export function memberSubmissionSchema(fee: number, offered: readonly string[]) {
  return membershipPaymentSchema(fee, offered).extend({
    referenceCode: z.string(INVALID).refine(isValidReferenceCode, INVALID).nullish(),
    id: z.string().optional(),
  });
}

export type MemberSubmission = z.infer<ReturnType<typeof memberSubmissionSchema>>;
