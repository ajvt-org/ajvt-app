import { z } from "zod";

const INVALID = "بيانات غير صالحة";
const NAME_REQUIRED = "الاسم الكامل مطلوب";
const NAME_TOO_LONG = "الاسم الكامل طويل جداً (30 حرفاً كحد أقصى)";
const AGE_REQUIRED = "اسم العصر مطلوب";
const AGE_TOO_LONG = "اسم العصر طويل جداً (30 حرفاً كحد أقصى)";

const NAME_MAX = 30;
const AGE_MAX = 30;

export const adminMemberUpdateSchema = z.object({
  fullName: z
    .string(NAME_REQUIRED)
    .refine((v) => v.trim().length > 0, NAME_REQUIRED)
    .refine((v) => v.trim().length <= NAME_MAX, NAME_TOO_LONG)
    .transform((v) => v.trim())
    .optional(),
  phone: z.string(INVALID).nullish(),
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
