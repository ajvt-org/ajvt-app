import { z } from "zod";

const INVALID = "بيانات غير صالحة";

export const pushUnsubscribeSchema = z.object({
  endpoint: z.string(INVALID).min(1, INVALID),
});
