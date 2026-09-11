import { z } from "zod";
import { members } from "@/lib/messages";
import { MAX_ENDING_REASON } from "@/lib/membershipEnding";

export const endMembershipSchema = z.object({
  reason: z
    .string(members.endingReasonRequired)
    .min(1, members.endingReasonRequired)
    .max(MAX_ENDING_REASON, members.endingReasonInvalid),
});
