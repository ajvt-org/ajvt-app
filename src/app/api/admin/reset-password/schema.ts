import { z } from "zod";
import { common } from "@/lib/messages";

const INVALID = common.invalidBody;

export const resetPasswordSchema = z.object({
  userId: z.string(INVALID).min(1, INVALID),
});
