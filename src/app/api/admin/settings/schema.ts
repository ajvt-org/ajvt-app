import { z } from "zod";
import { auth, common, members, money, settings } from "@/lib/messages";
import { isMembershipYear } from "@/lib/membershipYear";

const INVALID = common.invalidBody;

const officerName = z
  .string(INVALID)
  .refine((v) => v.trim().length <= 60, settings.officerNameTooLong)
  .transform((v) => v.trim() || null)
  .nullish();

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
  membershipYear: z
    .unknown()
    .superRefine((v, ctx) => {
      if (!isMembershipYear(Number(v))) {
        ctx.addIssue({ code: "custom", message: members.yearInvalid });
      }
    })
    .transform((v) => Number(v)),
  supportWhatsapp: z
    .string(INVALID)
    .refine((v) => /^\d{8,15}$/.test(v.trim()), settings.whatsappInvalid)
    .transform((v) => v.trim()),
  tempPasswordHours: z
    .unknown()
    .superRefine((v, ctx) => {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1 || n > 720) {
        ctx.addIssue({ code: "custom", message: auth.tempPasswordHoursInvalid });
      }
    })
    .transform((v) => Number(v)),
  whatsappGroup: z
    .string(INVALID)
    .refine((v) => v === "" || v.startsWith("https://"), settings.groupLinkInvalid)
    .transform((v) => v.trim() || null)
    .nullish(),
  secretaryName: officerName,
  treasurerName: officerName,
});
