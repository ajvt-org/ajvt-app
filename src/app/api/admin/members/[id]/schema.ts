import { z } from "zod";
import { ageGroups, common, members } from "@/lib/messages";

const INVALID = common.invalidBody;
const NAME_REQUIRED = members.fullNameRequired;
const NAME_TOO_LONG = members.fullNameTooLong;
const AGE_REQUIRED = ageGroups.nameRequired;
const AGE_TOO_LONG = ageGroups.nameTooLong;

const NAME_MAX = 30;
const AGE_MAX = 30;

export const adminMemberUpdateSchema = z.object({
  fullName: z
    .string(NAME_REQUIRED)
    .refine((v) => v.trim().length > 0, NAME_REQUIRED)
    .refine((v) => v.trim().length <= NAME_MAX, NAME_TOO_LONG)
    .transform((v) => v.trim())
    .optional(),
  paymentMethod: z
    .string(INVALID)
    .refine((v) => v.trim().length > 0, INVALID)
    .transform((v) => v.trim())
    .optional(),
  age: z
    .string(AGE_REQUIRED)
    .refine((v) => v.trim().length > 0, AGE_REQUIRED)
    .refine((v) => v.trim().length <= AGE_MAX, AGE_TOO_LONG)
    .transform((v) => v.trim())
    .optional(),
  photo: z.string(INVALID).nullish(),
  paidAmount: z.unknown().optional(),
  accountPhone: z.string(INVALID).optional(),
});
