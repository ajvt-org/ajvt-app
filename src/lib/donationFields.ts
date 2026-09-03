import { z } from "zod";
import { validatePhone } from "./utils";
import { common, money } from "./messages";

const INVALID = common.invalidBody;
const NAME_MAX = 50;

export const donorName = z
  .string(money.nameRequired)
  .refine((v) => v.trim().length > 0, money.nameRequired)
  .refine((v) => v.trim().length <= NAME_MAX, money.nameTooLong)
  .transform((v) => v.trim());

export const donorPhone = z
  .string(INVALID)
  .superRefine((v, ctx) => {
    if (v === "") return;
    const phoneError = validatePhone(v);
    if (phoneError) ctx.addIssue({ code: "custom", message: phoneError });
  })
  .transform((v) => v.trim() || null);

export const amount = z
  .unknown()
  .superRefine((v, ctx) => {
    const n = Number(v);
    if (!Number.isInteger(n) || n <= 0) {
      ctx.addIssue({ code: "custom", message: money.amountInvalid });
    }
  })
  .transform((v) => Number(v));

export const optionalText = z
  .string(INVALID)
  .nullish()
  .transform((v) => (v === undefined ? undefined : v || null));

export const accountId = z.string(INVALID).nullish();

export function paymentMethodIn(accepted: readonly string[]) {
  return z
    .string(money.paymentMethodInvalid)
    .refine((v) => accepted.includes(v), money.paymentMethodInvalid);
}

export interface DonationFormValues {
  donorName?: string;
  donorPhone: string;
  amount: string;
}

const withName = z.object({ donorName, donorPhone: donorPhone.nullish(), amount });
const withoutName = z.object({
  donorName: donorName.optional(),
  donorPhone: donorPhone.nullish(),
  amount,
});

export function donationFormError(values: DonationFormValues, nameRequired: boolean): string {
  const result = (nameRequired ? withName : withoutName).safeParse(values);
  return result.success ? "" : result.error.issues[0].message;
}
