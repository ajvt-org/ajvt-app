import { z } from "zod";
import { capacity } from "../schema";

const INVALID = "بيانات غير صالحة";
const TITLE_REQUIRED = "العنوان مطلوب";
const TITLE_TOO_LONG = "العنوان طويل جداً (60 حرفاً كحد أقصى)";
const DESCRIPTION_REQUIRED = "الوصف مطلوب";
const DESCRIPTION_TOO_LONG = "الوصف طويل جداً (1000 حرف كحد أقصى)";

const TITLE_MAX = 60;
const DESCRIPTION_MAX = 1000;

const order = z.unknown().superRefine((v, ctx) => {
  if (!Number.isInteger(Number(v))) ctx.addIssue({ code: "custom", message: INVALID });
});

export const activityUpdateSchema = z.object({
  title: z
    .string(TITLE_REQUIRED)
    .refine((v) => v.trim().length > 0, TITLE_REQUIRED)
    .refine((v) => v.trim().length <= TITLE_MAX, TITLE_TOO_LONG)
    .transform((v) => v.trim())
    .optional(),
  description: z
    .string(DESCRIPTION_REQUIRED)
    .refine((v) => v.trim().length > 0, DESCRIPTION_REQUIRED)
    .refine((v) => v.trim().length <= DESCRIPTION_MAX, DESCRIPTION_TOO_LONG)
    .transform((v) => v.trim())
    .optional(),
  period: z.string(INVALID).nullish(),
  capacity: capacity.optional(),
  isOpen: z.unknown().optional(),
  photo: z.string(INVALID).nullish(),
  isTournament: z.unknown().optional(),
  isVolunteer: z.unknown().optional(),
  whatsappLink: z.string(INVALID).nullish(),
  order: order.optional(),
});
