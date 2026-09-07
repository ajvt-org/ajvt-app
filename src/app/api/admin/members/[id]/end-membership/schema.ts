import { z } from "zod";
import { members } from "@/lib/messages";

export const endMembershipSchema = z.object({
  reason: z.string(members.endingReasonRequired).min(1, members.endingReasonRequired),
});
