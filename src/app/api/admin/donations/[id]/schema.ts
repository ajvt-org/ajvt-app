import { z } from "zod";
import { accountId, amount, donorName, donorPhone, optionalText, paymentMethod } from "../schema";
import { common } from "@/lib/messages";

const INVALID = common.invalidBody;

export const donationUpdateSchema = z
  .object({
    status: z.enum(["ACTIVE", "REJECTED"], INVALID).optional(),
    userId: accountId,
    anonymous: z.boolean(INVALID).optional(),
    donorName: donorName.nullish(),
    donorPhone: donorPhone.nullish(),
    donorPhoto: optionalText,
    amount: amount.optional(),
    paymentMethod: paymentMethod.nullish(),
    proof: optionalText,
    tagIds: z.array(z.string(INVALID), INVALID).optional(),
    activityId: z.string(INVALID).nullish(),
    competitionId: z.string(INVALID).nullish(),
  })
  .refine((v) => Object.values(v).some((field) => field !== undefined), INVALID);
