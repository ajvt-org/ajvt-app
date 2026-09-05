import { z } from "zod";
import { accountId, amount, donorName, donorPhone, optionalText, paymentMethodIn } from "../schema";
import { common } from "@/lib/messages";
import { MAX_BANK_REFERENCE } from "@/lib/bankReference";

const INVALID = common.invalidBody;

export function donationUpdateSchema(accepted: readonly string[]) {
  return z
    .object({
      status: z.enum(["ACTIVE", "REJECTED"], INVALID).optional(),
      userId: accountId,
      anonymous: z.boolean(INVALID).optional(),
      donorName: donorName.nullish(),
      donorPhone: donorPhone.nullish(),
      donorPhoto: optionalText,
      amount: amount.optional(),
      paymentMethod: paymentMethodIn(accepted).nullish(),
      accountId: z.string(INVALID).nullish(),
      bankReference: z.string(INVALID).max(MAX_BANK_REFERENCE, INVALID).nullish(),
      proof: optionalText,
      tagIds: z.array(z.string(INVALID), INVALID).optional(),
      activityId: z.string(INVALID).nullish(),
      competitionId: z.string(INVALID).nullish(),
    })
    .refine((v) => Object.values(v).some((field) => field !== undefined), INVALID);
}
