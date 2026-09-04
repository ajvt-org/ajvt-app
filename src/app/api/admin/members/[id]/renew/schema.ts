import { z } from "zod";
import { common, members, money } from "@/lib/messages";

const INVALID = common.invalidBody;

export function renewSchema(accepted: readonly string[]) {
  return z.object({
    paidAmount: z.unknown().superRefine((v, ctx) => {
      const n = Number(v);
      if (!Number.isInteger(n) || n <= 0) {
        ctx.addIssue({ code: "custom", message: money.amountInvalid });
      }
    }),
    paymentMethod: z.string(INVALID).refine((v) => accepted.includes(v), members.pickPaymentMethod),
    paymentProof: z.string(INVALID).nullish(),
  });
}
