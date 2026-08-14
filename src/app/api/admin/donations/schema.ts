import { z } from "zod";
import { PAYMENT_METHODS } from "@/lib/donations";
import { validatePhone } from "@/lib/utils";

const INVALID = "بيانات غير صالحة";
const NAME_REQUIRED = "الاسم مطلوب";
const NAME_TOO_LONG = "الاسم طويل جداً (50 حرفاً كحد أقصى)";
const AMOUNT_INVALID = "المبلغ يجب أن يكون رقماً صحيحاً موجباً";
const METHOD_INVALID = "طريقة دفع غير صالحة";

const NAME_MAX = 50;

export const donorName = z
  .string(NAME_REQUIRED)
  .refine((v) => v.trim().length > 0, NAME_REQUIRED)
  .refine((v) => v.trim().length <= NAME_MAX, NAME_TOO_LONG)
  .transform((v) => v.trim());

export const donorPhone = z.string(INVALID).superRefine((v, ctx) => {
  if (v === "") return;
  const phoneError = validatePhone(v);
  if (phoneError) ctx.addIssue({ code: "custom", message: phoneError });
});

export const amount = z.unknown().superRefine((v, ctx) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) ctx.addIssue({ code: "custom", message: AMOUNT_INVALID });
});

export const paymentMethod = z
  .string(METHOD_INVALID)
  .refine((v) => PAYMENT_METHODS.includes(v), METHOD_INVALID);

export const donationCreateSchema = z.object({
  donorName,
  donorPhone: donorPhone.nullish(),
  amount,
  proof: z.string(INVALID).nullish(),
  donorPhoto: z.string(INVALID).nullish(),
  paymentMethod: paymentMethod.nullish(),
});
