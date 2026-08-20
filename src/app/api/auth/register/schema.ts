import { z } from "zod";
import { auth } from "@/lib/messages";
import { validatePhone } from "@/lib/utils";
import { MIN_PASSWORD_LENGTH } from "@/lib/passwordPolicy";

const REQUIRED = auth.credentialsRequired;

const phone = z
  .string(REQUIRED)
  .min(1, REQUIRED)
  .superRefine((value, ctx) => {
    const error = validatePhone(value);
    if (error) ctx.addIssue({ code: "custom", message: error });
  })
  .transform((value) => value.trim());

const password = z
  .string(REQUIRED)
  .min(1, REQUIRED)
  .refine((value) => value.length >= MIN_PASSWORD_LENGTH, auth.passwordTooShort);

export const registerSchema = z.object({ phone, password });
