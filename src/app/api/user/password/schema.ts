import { z } from "zod";
import { auth, common } from "@/lib/messages";
import { MIN_PASSWORD_LENGTH } from "@/lib/passwordPolicy";

const INVALID = common.invalidBody;

export const changePasswordSchema = z.object({
  currentPassword: z.string(INVALID).min(1, INVALID).optional(),
  newPassword: z.string(INVALID).min(MIN_PASSWORD_LENGTH, auth.passwordTooShort),
});
