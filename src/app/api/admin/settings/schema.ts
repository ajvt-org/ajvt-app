import { z } from "zod";

const INVALID = "بيانات غير صالحة";

export const appSettingsSchema = z.object({
  membershipFee: z
    .unknown()
    .superRefine((v, ctx) => {
      const n = Number(v);
      if (!Number.isInteger(n) || n <= 0) {
        ctx.addIssue({ code: "custom", message: "المبلغ يجب أن يكون رقماً صحيحاً موجباً" });
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
