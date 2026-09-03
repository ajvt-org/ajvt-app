import { z } from "zod";
import { common } from "@/lib/messages";
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
    donorName,
    donorPhone: donorPhone.nullish(),
    amount,
    proof: optionalText,
    donorPhoto: optionalText,
    paymentMethod: paymentMethodIn(accepted).nullish(),
    activityId: z.string(INVALID).nullish(),
    competitionId: z.string(INVALID).nullish(),
    userId: accountId,
  });
}
