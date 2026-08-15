import { z } from "zod";
import { validatePhone } from "@/lib/utils";
import { ageGroups, common, members } from "@/lib/messages";

const INVALID = common.invalidBody;
const ALL_REQUIRED = "جميع الحقول مطلوبة";
const NAME_TOO_LONG = members.fullNameTooLong;
const AGE_TOO_LONG = ageGroups.nameTooLong;
const STATUS_INVALID = "حالة غير صالحة";

const NAME_MAX = 30;
const AGE_MAX = 30;

const name = z
  .string(ALL_REQUIRED)
  .refine((v) => v.trim().length > 0, ALL_REQUIRED)
  .refine((v) => v.trim().length <= NAME_MAX, NAME_TOO_LONG)
  .transform((v) => v.trim());

const age = z
  .string(ALL_REQUIRED)
  .refine((v) => v.trim().length > 0, ALL_REQUIRED)
  .refine((v) => v.trim().length <= AGE_MAX, AGE_TOO_LONG)
  .transform((v) => v.trim());

export const adminMemberCreateSchema = z
  .object({
    accountPhone: z.string(ALL_REQUIRED).nullish(),
    fullName: name,
    memberPhone: z.string(ALL_REQUIRED).nullish(),
    phoneUnknown: z.unknown().optional(),
    age,
    paymentMethod: z.string(ALL_REQUIRED).refine((v) => v.trim().length > 0, ALL_REQUIRED),
    paymentProof: z.string(INVALID).nullish(),
    photo: z.string(INVALID).nullish(),
    status: z.enum(["PENDING", "ACTIVE"], STATUS_INVALID),
    paidAmount: z.unknown().optional(),
  })
  .superRefine((v, ctx) => {
    if (v.phoneUnknown) return;
    const phoneError = validatePhone(v.accountPhone ?? "");
    if (phoneError) {
      ctx.addIssue({ code: "custom", message: phoneError });
      return;
    }
    if (!v.memberPhone?.trim()) ctx.addIssue({ code: "custom", message: ALL_REQUIRED });
  });
