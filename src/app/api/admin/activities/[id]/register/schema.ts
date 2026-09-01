import { z } from "zod";
import { activities, common } from "@/lib/messages";

const INVALID = common.invalidBody;
const REASON_TOO_LONG = activities.rejectionReasonTooLong;

const REASON_MAX = 300;

export const adminRegisterSchema = z.object({
  userId: z.string(INVALID).min(1, INVALID),
});

export const registrationReviewSchema = z.object({
  registrationId: z.string(INVALID).min(1, INVALID),
  status: z.enum(["ACTIVE", "REJECTED"], INVALID),
  reason: z
    .string(INVALID)
    .refine((v) => v.trim().length <= REASON_MAX, REASON_TOO_LONG)
    .nullish(),
});
