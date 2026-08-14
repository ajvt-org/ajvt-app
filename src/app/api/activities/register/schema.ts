import { z } from "zod";

const INVALID = "بيانات غير صالحة";

export const activityRegisterSchema = z.object({
  activityId: z.string(INVALID).min(1, INVALID),
  memberId: z.string(INVALID).min(1, INVALID),
});
