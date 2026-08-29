import { z } from "zod";
import { validatePhone } from "@/lib/utils";
import { ageGroups, members, villages } from "@/lib/messages";
import { HOME_VILLAGE, VILLAGE_NAME_MAX, requiresAgeGroup } from "@/lib/villages";

const INVALID = "بيانات غير صالحة";
const NAME_MAX = 30;
const AGE_MAX = 30;

export const adminPersonCreateSchema = z
  .object({
    accountPhone: z.string(members.fullNameRequired).nullish(),
    phoneUnknown: z.unknown().optional(),
    fullName: z
      .string(members.fullNameRequired)
      .refine((v) => v.trim().length > 0, members.fullNameRequired)
      .refine((v) => v.trim().length <= NAME_MAX, members.fullNameTooLong)
      .transform((v) => v.trim()),
    age: z
      .string(INVALID)
      .refine((v) => v.trim().length <= AGE_MAX, ageGroups.nameTooLong)
      .transform((v) => v.trim())
      .nullish(),
    village: z
      .string(villages.pickVillage)
      .refine((v) => v.trim().length > 0, villages.pickVillage)
      .refine((v) => v.trim().length <= VILLAGE_NAME_MAX, villages.nameTooLong)
      .transform((v) => v.trim())
      .default(HOME_VILLAGE),
    photo: z.string(INVALID).nullish(),
  })
  .superRefine((v, ctx) => {
    if (requiresAgeGroup(v.village) && !v.age?.trim()) {
      ctx.addIssue({ code: "custom", path: ["age"], message: members.pickAgeGroup });
    }
    if (v.phoneUnknown) return;
    const phoneError = validatePhone(v.accountPhone ?? "");
    if (phoneError) ctx.addIssue({ code: "custom", path: ["accountPhone"], message: phoneError });
  });

export type AdminPersonCreate = z.infer<typeof adminPersonCreateSchema>;
