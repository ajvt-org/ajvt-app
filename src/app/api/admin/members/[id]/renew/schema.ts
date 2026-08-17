import { z } from "zod";
import { PAYMENT_METHODS } from "@/lib/donations";
import { common, members, money } from "@/lib/messages";

const INVALID = common.invalidBody;

export const renewSchema = z.object({
  paidAmount: z.unknown().superRefine((v, ctx) => {
    const n = Number(v);
    if (!Number.isInteger(n) || n <= 0) {
      ctx.addIssue({ code: "custom", message: money.amountInvalid });
    }
  }),
  paymentMethod: z
    .string(INVALID)
    .refine((v) => PAYMENT_METHODS.includes(v), members.pickPaymentMethod),
  paymentProof: z.string(INVALID).nullish(),
});
