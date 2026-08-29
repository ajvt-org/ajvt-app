import { z } from "zod";
import { common } from "@/lib/messages";

const INVALID = common.invalidBody;

export const memberPaymentSchema = z.object({
  amountTransferred: z.union([z.number(), z.null()]).optional(),
  paymentMethod: z
    .string(INVALID)
    .refine((v) => v.trim().length > 0, INVALID)
    .transform((v) => v.trim())
    .optional(),
  paymentProof: z.string(INVALID).nullish(),
});
