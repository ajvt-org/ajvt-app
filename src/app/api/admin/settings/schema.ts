import { z } from "zod";
import { common, money } from "@/lib/messages";

const INVALID = common.invalidBody;

export const appSettingsSchema = z.object({
  membershipFee: z
    .unknown()
    .superRefine((v, ctx) => {
      const n = Number(v);
      if (!Number.isInteger(n) || n <= 0) {
        ctx.addIssue({ code: "custom", message: money.amountInvalid });
      }
    })
    .transform((v) => Number(v)),
  supportWhatsapp: z
    .string(INVALID)
    .refine((v) => /^\d{8,15}$/.test(v.trim()), "رقم الواتساب غير صالح")
    .transform((v) => v.trim()),
  whatsappGroup: z
    .string(INVALID)
    .refine((v) => v === "" || v.startsWith("https://"), "الرابط غير صالح")
    .transform((v) => v.trim() || null)
    .nullish(),
});
