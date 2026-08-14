import { z } from "zod";

const INVALID = "بيانات غير صالحة";

export const pushSubscribeSchema = z.object({
  endpoint: z.string(INVALID).min(1, INVALID),
  keys: z.object(
    {
      p256dh: z.string(INVALID).min(1, INVALID),
      auth: z.string(INVALID).min(1, INVALID),
    },
    INVALID,
  ),
});
