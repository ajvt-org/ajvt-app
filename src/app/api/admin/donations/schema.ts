import { z } from "zod";
import { common } from "@/lib/messages";
import {
  accountId,
  amount,
  donorName,
  donorPhone,
  optionalText,
  paymentMethod,
} from "@/lib/donationFields";

export { accountId, amount, donorName, donorPhone, optionalText, paymentMethod };

const INVALID = common.invalidBody;

export const donationCreateSchema = z.object({
  donorName,
  donorPhone: donorPhone.nullish(),
  amount,
  proof: optionalText,
  donorPhoto: optionalText,
  paymentMethod: paymentMethod.nullish(),
  activityId: z.string(INVALID).nullish(),
  userId: accountId,
});
