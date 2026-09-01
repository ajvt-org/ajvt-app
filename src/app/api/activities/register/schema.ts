import { z } from "zod";
import { common } from "@/lib/messages";

const INVALID = common.invalidBody;

export const activityRegisterSchema = z.object({
  activityId: z.string(INVALID).min(1, INVALID),
  userId: z.string(INVALID).min(1, INVALID),
});
