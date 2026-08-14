import { z } from "zod";

const INVALID = "بيانات غير صالحة";
const BOTH_REQUIRED = "العنوان والوصف مطلوبان";
const TITLE_TOO_LONG = "العنوان طويل جداً (60 حرفاً كحد أقصى)";
const DESCRIPTION_TOO_LONG = "الوصف طويل جداً (1000 حرف كحد أقصى)";
const CAPACITY_INVALID = "السعة يجب أن تكون رقماً صحيحاً موجباً";

const TITLE_MAX = 60;
const DESCRIPTION_MAX = 1000;

export const capacity = z
  .unknown()
  .superRefine((v, ctx) => {
    if (v === null || v === "") return;
    const n = Number(v);
    if (!Number.isInteger(n) || n <= 0) ctx.addIssue({ code: "custom", message: CAPACITY_INVALID });
  })
  .transform((v) => (v === null || v === "" ? null : Number(v)));

export const activityCreateSchema = z.object({
  title: z
    .string(BOTH_REQUIRED)
    .refine((v) => v.trim().length > 0, BOTH_REQUIRED)
    .refine((v) => v.trim().length <= TITLE_MAX, TITLE_TOO_LONG)
    .transform((v) => v.trim()),
  description: z
    .string(BOTH_REQUIRED)
    .refine((v) => v.trim().length > 0, BOTH_REQUIRED)
    .refine((v) => v.trim().length <= DESCRIPTION_MAX, DESCRIPTION_TOO_LONG)
    .transform((v) => v.trim()),
  period: z.string(INVALID).nullish(),
  photo: z.string(INVALID).nullish(),
  capacity: capacity.optional(),
  isTournament: z.unknown().optional(),
  isVolunteer: z.unknown().optional(),
  whatsappLink: z.string(INVALID).nullish(),
});
