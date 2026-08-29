import { z } from "zod";
import { ageGroups, auth, common, members, villages } from "@/lib/messages";
import { HOME_VILLAGE, VILLAGE_NAME_MAX, requiresAgeGroup } from "@/lib/villages";
import { isArabicName } from "@/lib/arabicName";
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

const fullName = z
  .string(members.fullNameRequired)
  .min(1, members.fullNameRequired)
  .refine((v) => v.trim().length <= 30, members.fullNameTooLong)
  .refine(isArabicName, members.fullNameArabicOnly)
  .transform((v) => v.trim());

const village = z
  .string(villages.pickVillage)
  .min(1, villages.pickVillage)
  .refine((v) => v.trim().length <= VILLAGE_NAME_MAX, villages.nameTooLong)
  .transform((v) => v.trim())
  .default(HOME_VILLAGE);

export const registerSchema = z
  .object({
    phone,
    password,
    fullName,
    village,
    age: z
      .string(common.invalidBody)
      .refine((v) => v.trim().length <= 30, ageGroups.nameTooLong)
      .transform((v) => v.trim())
      .nullish(),
    photo: z.string(common.invalidBody).nullish(),
  })
  .superRefine((v, ctx) => {
    if (requiresAgeGroup(v.village) && !v.age) {
      ctx.addIssue({ code: "custom", path: ["age"], message: members.pickAgeGroup });
    }
  });
