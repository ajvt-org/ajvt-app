import { z } from "zod";

const INVALID = "بيانات غير صالحة";

export const resetPasswordSchema = z.object({
  userId: z.string(INVALID).min(1, INVALID),
});
