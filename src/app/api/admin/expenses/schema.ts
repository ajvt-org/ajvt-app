import { z } from "zod";
import { common, money } from "@/lib/messages";

const INVALID = common.invalidBody;
const LABEL_REQUIRED = "وصف المصروف مطلوب";
const LABEL_TOO_LONG = "الوصف طويل جداً (100 حرف كحد أقصى)";
const AMOUNT_INVALID = money.amountInvalid;
const DATE_INVALID = common.invalidDate;

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

const tagIds = z.array(z.string(INVALID)).optional();

export const expenseCreateSchema = z.object({
  label,
  amount,
  note: z.string(INVALID).nullish(),
  proof: z.string(INVALID).nullish(),
  date: date.optional(),
  tagIds,
});

export const expenseUpdateSchema = z
  .object({
    label: label.optional(),
    amount: amount.optional(),
    note: z.string(INVALID).nullish(),
    proof: z.string(INVALID).nullish(),
    date: date.optional(),
    tagIds,
  })
  .refine(
    (v) =>
      [v.label, v.amount, v.note, v.date, v.proof, v.tagIds].some((field) => field !== undefined),
    INVALID,
  );
