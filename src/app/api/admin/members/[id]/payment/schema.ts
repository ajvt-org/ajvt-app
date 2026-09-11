import { z } from "zod";
import { common } from "@/lib/messages";
import { MAX_BANK_REFERENCE } from "@/lib/bankReference";
import { paidOn } from "@/lib/donationFields";

const INVALID = common.invalidBody;

export const memberPaymentSchema = z.object({
  amountTransferred: z.union([z.number(), z.null()]).optional(),
  paymentMethod: z
    .string(INVALID)
    .refine((v) => v.trim().length > 0, INVALID)
    .transform((v) => v.trim())
    .optional(),
  accountId: z.string(INVALID).nullish(),
  paymentProof: z.string(INVALID).nullish(),
  bankReference: z.string(INVALID).max(MAX_BANK_REFERENCE, INVALID).nullish(),
  paidOn: paidOn.optional(),
});
