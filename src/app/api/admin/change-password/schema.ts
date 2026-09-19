import { z } from "zod";
import { auth, common } from "@/lib/messages";
import { MIN_PASSWORD_LENGTH } from "@/lib/passwordPolicy";

const REQUIRED = common.allFieldsRequired;

export const adminChangePasswordSchema = z.object({
  currentPassword: z.string(REQUIRED).min(1, REQUIRED),
  newPassword: z
    .string(REQUIRED)
    .min(1, REQUIRED)
    .refine((value) => value.length >= MIN_PASSWORD_LENGTH, auth.passwordTooShort),
});
