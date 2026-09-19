import { z } from "zod";
import { admins as messages, auth, common } from "@/lib/messages";
import { MIN_PASSWORD_LENGTH } from "@/lib/passwordPolicy";

const REQUIRED = common.allFieldsRequired;
const USERNAME_MAX = 30;

export const adminCreateSchema = z.object({
  username: z
    .string(REQUIRED)
    .min(1, REQUIRED)
    .refine((value) => value.trim().length <= USERNAME_MAX, messages.usernameTooLong)
    .transform((value) => value.trim()),
  password: z
    .string(REQUIRED)
    .min(1, REQUIRED)
    .refine((value) => value.length >= MIN_PASSWORD_LENGTH, auth.passwordTooShort),
  role: z.unknown().optional(),
});
