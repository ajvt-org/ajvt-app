import { z } from "zod";
import { amount, donorName, donorPhone, paymentMethod } from "../schema";
import { common } from "@/lib/messages";

const INVALID = common.invalidBody;

export const donationUpdateSchema = z
  .object({
    status: z.enum(["ACTIVE", "REJECTED"], INVALID).optional(),
    memberId: z.string(INVALID).nullish(),
    donorName: donorName.nullish(),
    donorPhone: donorPhone.nullish(),
    donorPhoto: z.string(INVALID).nullish(),
    amount: amount.optional(),
    paymentMethod: paymentMethod.nullish(),
    proof: z.string(INVALID).nullish(),
    tagIds: z.array(z.string(INVALID), INVALID).optional(),
  })
  .refine((v) => Object.values(v).some((field) => field !== undefined), INVALID);
