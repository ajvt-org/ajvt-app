import { z } from "zod";
import { common } from "@/lib/messages";
import { MAX_BANK_REFERENCE } from "@/lib/bankReference";
import {
  accountId,
  amount,
  donorName,
  donorPhone,
  optionalText,
  paymentMethodIn,
} from "@/lib/donationFields";

export { accountId, amount, donorName, donorPhone, optionalText, paymentMethodIn };

const INVALID = common.invalidBody;

export function donationCreateSchema(accepted: readonly string[]) {
  return z.object({
    donorName: donorName.nullish(),
    donorPhone: donorPhone.nullish(),
    amount,
    proof: optionalText,
    donorPhoto: optionalText,
    paymentMethod: paymentMethodIn(accepted).nullish(),
    accountId: z.string(INVALID).nullish(),
    bankReference: z.string(INVALID).max(MAX_BANK_REFERENCE, INVALID).nullish(),
    anonymous: z.boolean(INVALID).optional(),
    activityId: z.string(INVALID).nullish(),
    competitionId: z.string(INVALID).nullish(),
    userId: accountId,
  });
}
