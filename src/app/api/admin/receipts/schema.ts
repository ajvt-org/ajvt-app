import { z } from "zod";
import { common, money, receipts } from "@/lib/messages";
import { MAX_SPELLED } from "@/lib/arabicNumberWords";

const INVALID = common.invalidBody;
const {
  payerRequired: PAYER_REQUIRED,
  payerTooLong: PAYER_TOO_LONG,
  reasonRequired: REASON_REQUIRED,
  reasonTooLong: REASON_TOO_LONG,
  voidReasonRequired: VOID_REASON_REQUIRED,
} = receipts;

const payerName = z
  .string(PAYER_REQUIRED)
  .refine((v) => v.trim().length > 0, PAYER_REQUIRED)
  .refine((v) => v.trim().length <= 80, PAYER_TOO_LONG)
  .transform((v) => v.trim());

const reason = z
  .string(REASON_REQUIRED)
  .refine((v) => v.trim().length > 0, REASON_REQUIRED)
  .refine((v) => v.trim().length <= 120, REASON_TOO_LONG)
  .transform((v) => v.trim());

const amount = z
  .unknown()
  .superRefine((v, ctx) => {
    const n = Number(v);
    if (!Number.isInteger(n) || n <= 0 || n > MAX_SPELLED) {
      ctx.addIssue({ code: "custom", message: money.amountInvalid });
    }
  })
  .transform((v) => Number(v));

const issuedOn = z.unknown().superRefine((v, ctx) => {
  if (v === null || v === undefined) return;
  if (Number.isNaN(new Date(v as string).getTime())) {
    ctx.addIssue({ code: "custom", message: common.invalidDate });
  }
});

export const receiptCreateSchema = z.object({
  payerName,
  reason,
  amount,
  issuedOn: issuedOn.optional(),
  memberId: z.string(INVALID).nullish(),
});

export const receiptVoidSchema = z.object({
  reason: z
    .string(VOID_REASON_REQUIRED)
    .refine((v) => v.trim().length > 0, VOID_REASON_REQUIRED)
    .refine((v) => v.trim().length <= 120, REASON_TOO_LONG)
    .transform((v) => v.trim()),
});
