import { z } from "zod";
import { auth, common } from "@/lib/messages";

const INVALID = common.invalidBody;

export const changePasswordSchema = z.object({
  currentPassword: z.string(INVALID).min(1, INVALID),
  newPassword: z.string(INVALID).min(3, auth.passwordTooShort),
});
