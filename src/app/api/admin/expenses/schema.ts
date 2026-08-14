import { z } from "zod";

const INVALID = "بيانات غير صالحة";
const LABEL_REQUIRED = "وصف المصروف مطلوب";
const LABEL_TOO_LONG = "الوصف طويل جداً (100 حرف كحد أقصى)";
const AMOUNT_INVALID = "المبلغ يجب أن يكون رقماً صحيحاً موجباً";
const DATE_INVALID = "تاريخ غير صالح";

const label = z
  .string(LABEL_REQUIRED)
  .refine((v) => v.trim().length > 0, LABEL_REQUIRED)
  .refine((v) => v.trim().length <= 100, LABEL_TOO_LONG)
  .transform((v) => v.trim());

const amount = z.unknown().superRefine((v, ctx) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) ctx.addIssue({ code: "custom", message: AMOUNT_INVALID });
});

const date = z.unknown().superRefine((v, ctx) => {
  if (v === null || v === undefined) return;
  if (Number.isNaN(new Date(v as string).getTime())) {
    ctx.addIssue({ code: "custom", message: DATE_INVALID });
  }
});

export const expenseCreateSchema = z.object({
  label,
  amount,
  note: z.string(INVALID).nullish(),
  proof: z.string(INVALID).nullish(),
  date: date.optional(),
});

export const expenseUpdateSchema = z
  .object({
    label: label.optional(),
    amount: amount.optional(),
    note: z.string(INVALID).nullish(),
    proof: z.string(INVALID).nullish(),
    date: date.optional(),
  })
  .refine(
    (v) => [v.label, v.amount, v.note, v.date, v.proof].some((field) => field !== undefined),
    INVALID,
  );
