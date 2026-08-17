import { z } from "zod";
import { activities, common } from "@/lib/messages";

const INVALID = common.invalidBody;
const BOTH_REQUIRED = "العنوان والوصف مطلوبان";
const TITLE_TOO_LONG = activities.titleTooLong;
const DESCRIPTION_TOO_LONG = activities.descriptionTooLong;
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

const DATE_INVALID = common.invalidDate;
const ORDER_INVALID = "تاريخ النهاية قبل تاريخ البداية";

export const activityDate = z
  .unknown()
  .superRefine((v, ctx) => {
    if (v === null || v === "" || v === undefined) return;
    if (typeof v !== "string" || Number.isNaN(new Date(v).getTime())) {
      ctx.addIssue({ code: "custom", message: DATE_INVALID });
    }
  })
  .transform((v) => (v === null || v === "" || v === undefined ? null : new Date(v as string)));

export function endsAfterStart(value: { startsAt?: Date | null; endsAt?: Date | null }): boolean {
  if (!value.startsAt || !value.endsAt) return true;
  return value.endsAt.getTime() >= value.startsAt.getTime();
}

export { ORDER_INVALID as DATE_ORDER_INVALID };

export const activityCreateSchema = z
  .object({
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
    format: z.enum(["KNOCKOUT", "GROUPS_THEN_KNOCKOUT"], INVALID).nullish(),
    teamSize: z.unknown().optional(),
    isVolunteer: z.unknown().optional(),
    whatsappLink: z.string(INVALID).nullish(),
    startsAt: activityDate.optional(),
    endsAt: activityDate.optional(),
    withTime: z.unknown().optional(),
  })
  .refine(endsAfterStart, { message: ORDER_INVALID, path: ["endsAt"] });
