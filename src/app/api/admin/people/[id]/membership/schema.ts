import { z } from "zod";
import { common, members } from "@/lib/messages";

const INVALID = common.invalidBody;

export const adminMembershipCreateSchema = z.object({
  paymentMethod: z
    .string(members.pickPaymentMethod)
    .refine((v) => v.trim().length > 0, members.pickPaymentMethod),
  paymentProof: z.string(INVALID).nullish(),
  paidAmount: z.unknown().optional(),
  surplusAnonymous: z.boolean(INVALID).optional(),
  status: z.enum(["PENDING", "ACTIVE"], members.statusInvalid),
});
